require 'sinatra'
require_relative 'tracks'  # Assurez-vous que ce fichier est dans le même répertoire

get '/generate_pdf' do
  tracks = fetch_tracks_from_server
  file = "output.pdf"
  save_tracks_info_to_pdf(tracks, file)  # Cette fonction doit maintenant renvoyer les données du PDF

  if File.exist?(file)
    send_file file, :disposition => 'attachment'
  end
end