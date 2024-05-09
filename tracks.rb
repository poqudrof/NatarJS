require 'net/http'
require 'json'
require 'fileutils'
require 'open-uri'
require 'prawn'

# Remplacez par votre propre Bearer Token
BEARER_TOKEN = "BQCCiugpJRs3v2jU1VegBeZUfXLNfR2KKJ8YSyDTZ5c2N2uAKrG9fKY952_d_AkSRRWdMfRaIVUTuyaW2cJTH8B3vGxAHCDn82P43sHZy5kuNEIBBcchjBrhPftqJKyLKTRCzVYkijlLDiuo7Z7PyUveCULYweCxMie2DOof07UJ5OwUvG1RK2uhAkz8L3_nHCg6xC2rss7uTUFsAVXq0HON9Ck0cvzrNhhOSXMwbgX07MZon413UN3q48_BiNFhhTWC0XZW0qJx5UtvzfGE7Wa2FPkyXHDOCu0IZMzdkSAHVTgt9PGxdzsgKM4ZDhAA6_8"

# Configuration des en-têtes d'authentification
HEADERS = {
  'Authorization' => "Bearer #{BEARER_TOKEN}"
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


# Fonction pour obtenir les informations d'un morceau
def get_track_info(track)

  # ex: "https://open.spotify.com/intl-fr/track/29U7stRjqHU6rMiS8BfaI9?si=b6b04e1427be41b3"
  # 
  track_id = track.split('/').last.split('?').first

  url = URI("https://api.spotify.com/v1/tracks/#{track_id}")
  http = Net::HTTP.new(url.host, url.port)
  http.use_ssl = true

  request = Net::HTTP::Get.new(url, HEADERS)
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

# Fonction pour enregistrer les informations dans un PDF
def save_tracks_info_to_pdf(tracks, output_pdf = 'tracks_info.pdf', image_directory = './images')
  FileUtils.mkdir_p(image_directory) unless Dir.exist?(image_directory)

  Prawn::Document.generate(output_pdf) do |pdf|

    ## Tracks : 
#     {"10"=>"https://open.spotify.com/intl-fr/track/29U7stRjqHU6rMiS8BfaI9?si=b6b04e1427be41b3",
#  "23"=>"https://open.spotify.com/intl-fr/track/29U7stRjqHU6rMiS8BfaI9?si=b6b04e1427be41b3",
#  "40"=>"https://open.spotify.com/intl-fr/track/1YrC8s6yZWw23QxW6rfM9f?si=e195703f873844f7"}

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

      # generate_square_image(square_image_path, "Track #{code + 1}")

      # Création de la carte
      # pdf.text "Carte #{code} :", size: 18, style: :bold
      pdf.move_down 10
      pdf.text "Artiste : #{track_info['artist_name']}", size: 12
      pdf.text "Titre : #{track_info['track_title']}", size: 12
      pdf.text "Album : #{track_info['album_name']}", size: 12
      pdf.text "Date de sortie : #{track_info['album_release_date']}", size: 12
      pdf.text "Durée : #{track_info['duration']}", size: 12

      pdf.move_down 10
      # pdf.text 'Image de l\'album :', size: 14, style: :bold
      pdf.image album_image_path, width: 150, height: 150

      pdf.move_down 10
      #pdf.text 'Code :', size: 14, style: :bold
      pdf.image square_image_path, width: 150, height: 150

      pdf.move_down 20
    end
  end

  puts "PDF généré sous #{output_pdf}"
end


tracks = fetch_tracks_from_server
save_tracks_info_to_pdf(tracks)

