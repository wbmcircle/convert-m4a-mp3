const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

const app = express();
const port = 3000;

// Configure FFmpeg binary
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Utility function to download a file from a URL
const downloadFile = async (fileUrl, outputLocationPath) => {
  const writer = fs.createWriteStream(outputLocationPath);
  const response = await axios({
    url: fileUrl,
    method: 'GET',
    responseType: 'stream',
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

// Endpoint to download, convert, and clean up
app.post('/convert', async (req, res) => {
  const fileUrl = req.query.url; // Example: Input as a query parameter "?url=<url>"
  if (!fileUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // Step 1: Download the file
    const inputFileName = `input_${Date.now()}.m4a`; // Unique name for downloaded file
    const inputFilePath = path.join(__dirname, 'uploads', inputFileName);

    console.log('Downloading file...');
    await downloadFile(fileUrl, inputFilePath);
    console.log('File downloaded:', inputFilePath);

    // Step 2: Convert the file to .mp3
    const outputFileName = `${Date.now()}.mp3`; // Unique name for converted file
    const outputFilePath = path.join(__dirname, 'uploads', outputFileName);

    ffmpeg(inputFilePath)
      .toFormat('mp3')
      .on('end', () => {
        console.log('Conversion finished successfully');

        // Step 3: Delete the original file
        fs.unlinkSync(inputFilePath);
        console.log('Original file deleted:', inputFilePath);

        // Return the path of the converted file
        res.json({
          message: 'File converted successfully',
          path: outputFilePath,
        });
      })
      .on('error', (err) => {
        console.error('Error during conversion:', err);
        res.status(500).json({ error: 'Error converting file' });
      })
      .save(outputFilePath); // Start the conversion
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'An error occurred during the process' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
