# pip install opencv-contrib-python opencv-python
#!/usr/bin/env python

'''
Bienvenue dans le générateur de marqueurs ArUco !

Ce programme :
  - Génère des marqueurs ArUco en utilisant OpenCV et Python
'''

from __future__ import print_function  # Compatibilité Python 2/3
import cv2  # Importer la bibliothèque OpenCV
import numpy as np  # Importer la bibliothèque Numpy
import argparse  # Gérer les arguments en ligne de commande

# Les différents dictionnaires ArUco intégrés dans la bibliothèque OpenCV.
ARUCO_DICT = {
    "DICT_4X4_50": cv2.aruco.DICT_4X4_50,
    "DICT_4X4_100": cv2.aruco.DICT_4X4_100,
    "DICT_4X4_250": cv2.aruco.DICT_4X4_250,
    "DICT_4X4_1000": cv2.aruco.DICT_4X4_1000,
    "DICT_5X5_50": cv2.aruco.DICT_5X5_50,
    "DICT_5X5_100": cv2.aruco.DICT_5X5_100,
    "DICT_5X5_250": cv2.aruco.DICT_5X5_250,
    "DICT_5X5_1000": cv2.aruco.DICT_5X5_1000,
    "DICT_6X6_50": cv2.aruco.DICT_6X6_50,
    "DICT_6X6_100": cv2.aruco.DICT_6X6_100,
    "DICT_6X6_250": cv2.aruco.DICT_6X6_250,
    "DICT_6X6_1000": cv2.aruco.DICT_6X6_1000,
    "DICT_7X7_50": cv2.aruco.DICT_7X7_50,
    "DICT_7X7_100": cv2.aruco.DICT_7X7_100,
    "DICT_7X7_250": cv2.aruco.DICT_7X7_250,
    "DICT_7X7_1000": cv2.aruco.DICT_7X7_1000,
    "DICT_ARUCO_ORIGINAL": cv2.aruco.DICT_ARUCO_ORIGINAL
}


def generate_aruco_marker(aruco_dict_name, marker_id, marker_size):
    """
    Fonction principale du programme.
    """
    # Vérifier que nous avons un marqueur ArUco valide
    if ARUCO_DICT.get(aruco_dict_name, None) is None:
        print("[INFO] Le dictionnaire ArUco '{}' n'est pas pris en charge.".format(aruco_dict_name))
        return

    # Charger le dictionnaire ArUco
    this_aruco_dictionary = cv2.aruco.getPredefinedDictionary(ARUCO_DICT[aruco_dict_name])

    # Allouer de la mémoire pour le marqueur ArUco
    print("[INFO] Génération du marqueur ArUco de type '{}' avec l'ID '{}'".format(aruco_dict_name, marker_id))

    # Créer le marqueur ArUco
    # this_marker = np.zeros((marker_size, marker_size, 1), dtype="uint8")
    # cv2.aruco.drawMarker(this_aruco_dictionary, marker_id, marker_size, this_marker, 1)
    
    this_marker = cv2.aruco.generateImageMarker(this_aruco_dictionary, marker_id, marker_size)

    # Nommer le fichier automatiquement
    output_filename = f"./images/{aruco_dict_name}_id{marker_id}.png"

    # Sauvegarder le marqueur ArUco
    cv2.imwrite(output_filename, this_marker)
    print(f"[INFO] Marqueur ArUco généré et sauvegardé sous le nom '{output_filename}'.")

    # Afficher le marqueur ArUco
    # cv2.imshow("ArUco Marker", this_marker)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()


if __name__ == '__main__':
    # Gérer les arguments en ligne de commande
    parser = argparse.ArgumentParser(description='Générer un marqueur ArUco.')
    parser.add_argument('dictionary', type=str, help="Nom du dictionnaire ArUco (ex: 'DICT_6X6_100').")
    parser.add_argument('id', type=int, help="ID du marqueur ArUco.")
    parser.add_argument('size', type=int, help="Taille en pixels du marqueur ArUco.")
    args = parser.parse_args()

    # Appeler la fonction de génération du marqueur
    generate_aruco_marker(args.dictionary, args.id, args.size)
