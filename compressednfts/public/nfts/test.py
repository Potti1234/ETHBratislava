import pandas as pd
import requests

# Load the CSV file as a pandas DataFrame
df = pd.read_csv('compressednfts/public/nfts/ImageData.csv')

i = 0
# Iterate through the first 100 rows
for index, row in df.head(3000).iterrows():
    # Get the image URL from the 'IMG1' column
    image_url = row['IMAGE_VERSION_1']
    
    # Download the image and save it with the filename as the index
    response = requests.get(image_url)
    if(response.status_code == 200):
        with open(f"compressednfts/public/nfts/{i}.jpg", 'wb') as f:
            f.write(response.content)
            i += 1