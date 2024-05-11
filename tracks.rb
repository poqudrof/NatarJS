require 'net/http'
require 'json'
require 'fileutils'
require 'open-uri'
require 'prawn'
require 'oauth2'

# Vos identifiants Spotify
CLIENT_ID = "82e5b8c865904528b0a965fc8ac6dbff"
CLIENT_SECRET = "0934df145fc241cdbb991d241f3f76e4"

# CLIENT_ID = "HIDDEN" 
# CLIENT_SECRET = "HIDDEN"

# # Fonction pour obtenir le token d'accès via OAuth2
# def get_access_token
#   client = OAuth2::Client.new(CLIENT_ID, CLIENT_SECRET, site: 'https://accounts.spotify.com')
#   token = client.client_credentials.get_token
#   token.token
# end

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


## qr.cli-ck.click  - port : 3434  sur HTTP


# Fonction pour télécharger une image
def download_image(url, file_path)
  open(file_path, 'wb') do |file|
    file << URI.open(url).read
  end
  puts "Image téléchargée et sauvegardée sous #{file_path}"
rescue StandardError => e
  puts "Erreur lors du téléchargement de l'image: #{e.message}"
end


  # Playlist ex: https://open.spotify.com/playlist/1TVCd0fTBqNSJDWL9Fzcy3?si=f27d89f5012540e7
  # Track ex: "https://open.spotify.com/intl-fr/track/29U7stRjqHU6rMiS8BfaI9?si=b6b04e1427be41b3"

# Fonction pour obtenir les informations d'un morceau
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

# Conversion de mm en points (1 mm = 2.83465 points)
def mm_to_pt(mm)
  mm * 2.83465
end

# Fonction pour enregistrer les informations dans un PDF
def save_tracks_info_to_pdf(tracks, output_pdf = 'tracks_info.pdf', image_directory = './images')
  FileUtils.mkdir_p(image_directory) unless Dir.exist?(image_directory)

  Prawn::Document.generate(output_pdf) do |pdf|

    ## Tracks : 
#     {"10"=>"https://open.spotify.com/intl-fr/track/29U7stRjqHU6rMiS8BfaI9?si=b6b04e1427be41b3",
#  "23"=>"https://open.spotify.com/intl-fr/track/29U7stRjqHU6rMiS8BfaI9?si=b6b04e1427be41b3",
#  "40"=>"https://open.spotify.com/intl-fr/track/1YrC8s6yZWw23QxW6rfM9f?si=e195703f873844f7"}
    index = 0
    tracks.each do |code, track_or_playlist|

      info = get_info(track_or_playlist)

      next unless info

      # Téléchargement de l'image
      # Déterminer le préfixe du nom de fichier en fonction du type
      prefix = info['type'] == 'tracks' ? info['artist_name'] : info['owner_name']
      # Créer le nom de fichier
      image_filename = "#{info['title']}_#{prefix}".gsub(' ', '_')

      # Supprimer les virgules et les caractères spéciaux
      image_filename = image_filename.gsub(/[^0-9A-Za-z_]/, '')

      # Ajouter l'extension ".jpg" si aucune extension n'est présente
      image_filename += ".png" unless image_filename.include?(".")

      # Créer le chemin complet du fichier
      image_path = File.join(image_directory, image_filename)
      p "PLAYLIST Image #{image_path} - #{info["playlist_image_url"]}" 

      ## Skip if the file already exists
      if File.exist?(image_path)
        puts "Image déjà téléchargée sous #{image_path}"
      else
        download_image(info['album_image_url'] || info['playlist_image_url'], image_path)
      end

      # Générer une image carrée personnalisée
      square_image_filename = "DICT_6X6_100_id#{code}.png"
      square_image_path = File.join(image_directory, square_image_filename)

      p "SQUARE Image #{square_image_path} - #{code}"
      `python generate_aruco.py DICT_6X6_100 #{code} 200`

      ## Check if the file was created 
      if File.exist?(square_image_path)
        puts "Image carrée générée sous #{square_image_path}"
      else  
        puts "Erreur lors de la génération de #{square_image_path}"
        next
      end

      # code DICT_6X6_100_id6.png 

      ## Rectangle around the card 
      x_position = index.even? ? 0 : mm_to_pt(70) # Définir la position X en fonction de la parité de l'index
      y_position = pdf.cursor

      ## gray instead of black
      pdf.stroke_color '222222'

      pdf.rounded_rectangle [-10, pdf.cursor], mm_to_pt(62 * 2 ), mm_to_pt(88), 5
      pdf.stroke

      begin_of_card = pdf.cursor

      pdf.move_down 10

      p "Drawing image #{image_path}"
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

      p "drawing square image #{square_image_path}"
      pdf.image square_image_path, width: 150, height: 150, at: [150 + 20, pdf.cursor - height - 10]

      pdf.move_down 40

      pdf.start_new_page if pdf.cursor < mm_to_pt(88)

      index = index + 1
    end
  end

  puts "PDF généré sous #{output_pdf}"
end


tracks = fetch_tracks_from_server
save_tracks_info_to_pdf(tracks)

