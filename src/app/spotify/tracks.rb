require 'net/http'
require 'json'
require 'fileutils'
require 'open-uri'
require 'prawn'
require 'oauth2'

# Vos identifiants Spotify
CLIENT_ID = "82e5b8c865904528b0a965fc8ac6dbff"
CLIENT_SECRET = "0934df145fc241cdbb991d241f3f76e4"

# Fonction pour obtenir le token d'accès
def get_access_token
  url = URI("https://accounts.spotify.com/api/token")
  http = Net::HTTP.new(url.host, url.port)
  http.use_ssl = true

  request = Net::HTTP::Post.new(url)
  request["Authorization"] = "Basic " + Base64.strict_encode64("#{CLIENT_ID}:#{CLIENT_SECRET}")
  request.set_form_data('grant_type' => 'client_credentials')

  response = http.request(request)
  result = JSON.parse(response.body)
  
  result["access_token"]
end

# Configuration des en-têtes d'authentification avec le token d'accès
bearer_token = get_access_token
$spotify_headers = {
  'Authorization' => "Bearer #{bearer_token}"
}

# Fonction pour télécharger une image
def download_image(url, file_path)
  open(file_path, 'wb') do |file|
    file << URI.open(url).read
  end
  puts "Image téléchargée et sauvegardée sous #{file_path}"
rescue StandardError => e
  puts "Erreur lors du téléchargement de l'image: #{e.message}"
end

# Fonction pour obtenir les informations d'un morceau ou d'une playlist
def get_info(track_or_playlist)
  id = track_or_playlist.split('/').last.split('?').first
  type = track_or_playlist.include?('playlist') ? 'playlists' : 'tracks'

  url = URI("https://api.spotify.com/v1/#{type}/#{id}")
  http = Net::HTTP.new(url.host, url.port)
  http.use_ssl = true

  request = Net::HTTP::Get.new(url, $spotify_headers)
  response = http.request(request)

  unless response.is_a?(Net::HTTPSuccess)
    puts 'Erreur lors de la récupération des informations'
    p response
    return nil
  end

  info = JSON.parse(response.body)

  if type == 'tracks'
    artist_name = info['artists'][0]['name']
    title = info['name']
    album_name = info['album']['name']
    album_release_date = info['album']['release_date']
    duration_ms = info['duration_ms']
    album_image_url = info['album']['images'][0]['url']
    duration_min_sec = "#{duration_ms / 60000}:#{(duration_ms / 1000) % 60}".rjust(2, '0')

    {
      'artist_name' => artist_name,
      'title' => title,
      'album_name' => album_name,
      'album_release_date' => album_release_date,
      'duration' => duration_min_sec,
      'album_image_url' => album_image_url,
      'type' => 'track'
    }
  else # Playlists
    title = info['name']
    owner_name = info['owner']['display_name']
    total_tracks = info['tracks']['total']
    playlist_image_url = info['images'][0]['url']

    {
      'title' => title,
      'owner_name' => owner_name,
      'total_tracks' => total_tracks,
      'playlist_image_url' => playlist_image_url,
      'type' => 'playlist'
    }
  end
end

# Fonction pour récupérer la liste des pistes depuis le serveur web local
def fetch_tracks_from_server
  url = URI('http://localhost:5000/links')
  response = Net::HTTP.get_response(url)

  if response.is_a?(Net::HTTPSuccess)
    JSON.parse(response.body)
  else
    puts "Erreur lors de la récupération de la liste des pistes"
    []
  end
end

# Fonction pour envoyer les mises à jour au serveur
def update_track_info(track_id, info)
  url = URI("http://localhost:5000/links/#{track_id}")
  http = Net::HTTP.new(url.host, url.port)
  request = Net::HTTP::Put.new(url, 'Content-Type' => 'application/json')
  request.body = info.to_json
  response = http.request(request)

  unless response.is_a?(Net::HTTPSuccess)
    puts "Erreur lors de la mise à jour des informations pour #{track_id}: #{response.message}"
  end
end

# Fonction pour vérifier si les données existent déjà sur le serveur
def data_exists?(track_id)
  url = URI("http://localhost:5000/links/#{track_id}")
  response = Net::HTTP.get_response(url)
  if response.is_a?(Net::HTTPSuccess)
    j = JSON.parse(response.body)
    j['info']
  else
    nil
  end
end

# Conversion de mm en points (1 mm = 2.83465 points)
def mm_to_pt(mm)
  mm * 2.83465
end

# Fonction pour enregistrer les informations dans un PDF et mettre à jour le serveur
def save_tracks_info_to_pdf(tracks, output_pdf = 'tracks_info.pdf', image_directory = './images')
  FileUtils.mkdir_p(image_directory) unless Dir.exist?(image_directory)

  Prawn::Document.generate(output_pdf) do |pdf|
    index = 0
    tracks.each do |track| 
      code = track['id'] 
      track_or_playlist = track['uri']

      # Vérifier si les données existent déjà sur le serveur
      existing_data = data_exists?(code)

      if existing_data
        puts "Les données pour le track ID #{code} existent déjà, saut de la récupération et de la génération."
        next
      end

      info = get_info(track_or_playlist)
      next unless info

      # Téléchargement de l'image
      prefix = info['type'] == 'track' ? info['artist_name'] : info['owner_name']
      image_filename = "#{info['title']}_#{prefix}".gsub(' ', '_').gsub(/[^0-9A-Za-z_]/, '') + ".png"
      image_path = File.join(image_directory, image_filename)

      if File.exist?(image_path)
        puts "Image déjà téléchargée sous #{image_path}"
      else
        download_image(info['album_image_url'] || info['playlist_image_url'], image_path)
      end

      square_image_filename = "DICT_6X6_100_id#{code}.png"
      square_image_path = File.join(image_directory, square_image_filename)

      `python generate_aruco.py DICT_6X6_100 #{code} 200`

      unless File.exist?(square_image_path)
        puts "Erreur lors de la génération de #{square_image_path}"
        next
      end

      x_position = index.even? ? 0 : mm_to_pt(70)
      y_position = pdf.cursor

      pdf.stroke_color '222222'
      pdf.rounded_rectangle [-10, pdf.cursor], mm_to_pt(62 * 2), mm_to_pt(88), 5
      pdf.stroke

      begin_of_card = pdf.cursor
      pdf.move_down 10
      pdf.image image_path, width: 150, height: 150
      pdf.move_down 10

      if info['type'] == 'track'
        pdf.text "Artiste : #{info['artist_name']}", size: 12
        pdf.text "Titre : #{info['title']}", size: 12, style: :bold
        pdf.text "Album : #{info['album_name']}", size: 12
        release_date = Date.strptime(info['album_release_date'], '%Y-%m-%d')
        formatted_date = release_date.strftime('%d/%m/%y')
        pdf.text "Date de sortie : #{formatted_date}", size: 12
        pdf.text "Durée : #{info['duration']}", size: 12
      else
        pdf.text "Titre : #{info['title']}", size: 12, style: :bold
        pdf.text "Propriétaire : #{info['owner_name']}", size: 12
        pdf.text "Nombre de pistes : #{info['total_tracks']}", size: 12
      end

      height = pdf.cursor - begin_of_card
      pdf.image square_image_path, width: 150, height: 150, at: [150 + 20, pdf.cursor - height - 10]
      pdf.move_down 40

      pdf.start_new_page if pdf.cursor < mm_to_pt(88)
      index += 1

      # Mettre à jour les données sur le serveur
      update_data = {
        'info' => info,
        'image_path' => image_path,
        'square_image_path' => square_image_path,
        'uri' => track_or_playlist # Conserver l'URI d'origine
      }
      update_track_info(code, update_data)
    end
  end

  puts "PDF généré sous #{output_pdf}"
end

# Exemple d'utilisation
# tracks = fetch_tracks_from_server
# save_tracks_info_to_pdf(tracks
