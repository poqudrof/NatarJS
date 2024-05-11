require 'net/http'
require 'json'
require 'fileutils'
require 'open-uri'
require 'prawn'
require 'oauth2'

# Vos identifiants Spotify

CLIENT_ID = "HIDDEN" 
CLIENT_SECRET = "HIDDEN"

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


# Fonction pour obtenir les informations d'un morceau
def get_track_info(track)

  # ex: "https://open.spotify.com/intl-fr/track/29U7stRjqHU6rMiS8BfaI9?si=b6b04e1427be41b3"
  # 
  track_id = track.split('/').last.split('?').first

  url = URI("https://api.spotify.com/v1/tracks/#{track_id}")
  http = Net::HTTP.new(url.host, url.port)
  http.use_ssl = true

  request = Net::HTTP::Get.new(url, $spotify_headers)
  response = http.request(request)

  unless response.is_a?(Net::HTTPSuccess)
    puts 'Erreur lors de la récupération des informations du morceau'
    p response
    return nil
  end

  track = JSON.parse(response.body)
  artist_name = track['artists'][0]['name']
  track_title = track['name']
  album_name = track['album']['name']
  album_release_date = track['album']['release_date']
  duration_ms = track['duration_ms']
  album_image_url = track['album']['images'][0]['url']
  duration_min_sec = "#{duration_ms / 60000}:#{(duration_ms / 1000) % 60}".rjust(2, '0')

  {
    'artist_name' => artist_name,
    'track_title' => track_title,
    'album_name' => album_name,
    'album_release_date' => album_release_date,
    'duration' => duration_min_sec,
    'album_image_url' => album_image_url
  }
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
    tracks.each do |code, track|
      track_info = get_track_info(track)

      next unless track_info

      # Téléchargement de l'image de l'album
      album_image_filename = "#{track_info['track_title']}_#{track_info['artist_name']}".gsub(' ', '_') + '.jpg'
      album_image_path = File.join(image_directory, album_image_filename)

      ## Skip if the file already exists
      if File.exist?(album_image_path)
        puts "Image de l'album déjà téléchargée sous #{album_image_path}"
      else
        download_image(track_info['album_image_url'], album_image_path)
      end

      # Générer une image carrée personnalisée
      square_image_filename = "DICT_6X6_100_id#{code}.png"
      square_image_path = File.join(image_directory, square_image_filename)

      `python generate_aruco.py DICT_6X6_100 #{code} 200`

      ## Check if the file was created 
      if File.exist?(square_image_path)
        puts "Image carrée générée sous #{square_image_path}"
      else  
        puts "Erreur lors de la génération de #{square_image_path}"
        next
      end


      # code DICT_6X6_100_id6.png 

      ## Rectangle arond the card 
      x_position = index.even? ? 0 : mm_to_pt(70) # Définir la position X en fonction de la parité de l'index
      y_position = pdf.cursor
      
      # pdf.stroke_color 'FF8844'
      ## gray instead of black
      pdf.stroke_color '222222'

      pdf.rounded_rectangle [-10, pdf.cursor], mm_to_pt(62 * 2 ), mm_to_pt(88), 5
      pdf.stroke
    
      begin_of_card = pdf.cursor

      # pdf.bounding_box([0, pdf.cursor], width: mm_to_pt(62 * 2 ), height: mm_to_pt(88)) do
      # generate_square_image(square_image_path, "Track #{code + 1}")
      # Création de la carte
      # pdf.text "Carte #{code} :", size: 18, style: :bold
      # pdf.move_down 10
      pdf.move_down 10
      # pdf.text 'Image de l\'album :', size: 14, style: :bold
      pdf.image album_image_path, width: 150, height: 150

      pdf.move_down 10
      pdf.text "Artiste : #{track_info['artist_name']}", size: 12
      pdf.text "Titre : #{track_info['track_title']}", size: 12, style: :bold
      pdf.text "Album : #{track_info['album_name']}", size: 12
      release_date = Date.strptime(track_info['album_release_date'], '%Y-%m-%d')
      formatted_date = release_date.strftime('%d/%m/%y')
      pdf.text "Date de sortie : #{formatted_date}", size: 12
      pdf.text "Durée : #{track_info['duration']}", size: 12

      height = pdf.cursor - begin_of_card
      # pdf.move_down(height)

      #pdf.text 'Code :', size: 14, style: :bold
      pdf.image square_image_path, width: 150, height: 150, at: [150 + 20, pdf.cursor - height - 10]
      

      
      pdf.move_down 20

      index = index + 1
    end
  end

  puts "PDF généré sous #{output_pdf}"
end


tracks = fetch_tracks_from_server
save_tracks_info_to_pdf(tracks)

