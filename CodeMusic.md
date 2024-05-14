# Code Music Spotify

Code Music Spotify is a project that allows you to create a json file with links to music tracks and then build a pdf file with the tracks and links to the tracks.

The project uses json-server to store the links and a json editor UI to update the json file. The project also uses a ruby script to build the pdf file.

## Building the cards

1. Start the database (json-server) 
```bash 
json-server --port 5000  markerLinks.json
```

2. Start the editor (json editor UI)
```bash
 yarn manage
```

3. Build a pdf from the json editor UI
```bash
ruby tracks.rb
```

## Running the app 

1. Start the database (json-server) 
```bash 
json-server --port 5000  markerLinks.json
```

2. Run spotify. 

3. Start the application. 
```bash
yarn exec parcel index.html
```


## Acknowledgements

* ChatGPT
* jsQR
* opencv.js
* Parcel

## Licence
MIT License
