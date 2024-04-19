import fs from 'fs';
import chokidar from 'chokidar';
import path from 'path';

const sourceDirectory = '/Users/eddiecontento/Ideas';
const destinationDirectory = 'content';
const filenamePattern = /-publish\.md$/; // Adjust the filename pattern as needed

// Function to copy file and its linked media files
async function copyFileAndMedia(filePath) {
    try {
        // Read the content of the file
        const data = await fs.promises.readFile(filePath, 'utf8');

        // Copy the main file
        const baseName = path.basename(filePath);
        const destinationFilePath = path.join(destinationDirectory, baseName);
        await fs.promises.copyFile(filePath, destinationFilePath);
        console.log(`File '${filePath}' copied successfully.`);

        // Function to recursively parse and copy linked notes and media files
        async function parseAndCopyLinkedFiles(content) {
            const mediaPaths = content.match(/!\[[^\]]*\]\(([^)]+)\)/g);
            const notePaths = content.match(/\[\[([^\]]+)\]\]/g);

            // Copy linked media files
            if (mediaPaths) {
                await Promise.all(mediaPaths.map(async mediaPath => {
                    const mediaFileName = mediaPath.match(/\(([^)]+)\)/)[1];
                    const mediaFilePath = path.join(path.dirname(filePath), mediaFileName);
                    const destinationMediaPath = path.join(destinationDirectory, mediaFileName);

                    // Check if the media file exists in the source directory before copying
                    if (fs.existsSync(mediaFilePath)) {
                        await fs.promises.copyFile(mediaFilePath, destinationMediaPath);
                        console.log(`Media file '${mediaFilePath}' copied successfully.`);
                    } else {
                        console.error(`Media file '${mediaFilePath}' does not exist.`);
                    }
                }));
            }

            // Copy linked note files and recursively parse them
            if (notePaths) {
                await Promise.all(notePaths.map(async notePath => {
                    const noteName = notePath.match(/\[\[([^\]]+)\]\]/)[1];
                    const noteFileName = noteName + '.md';
                    const noteFilePath = path.join(path.dirname(filePath), noteFileName);
                    const destinationNotePath = path.join(destinationDirectory, noteFileName);

                    // Check if the note file exists in the source directory before copying
                    if (fs.existsSync(noteFilePath)) {
                        await fs.promises.copyFile(noteFilePath, destinationNotePath);
                        console.log(`Note '${noteFilePath}' copied successfully.`);

                        // Read the content of the linked note
                        const linkedNoteContent = await fs.promises.readFile(noteFilePath, 'utf8');
                        await parseAndCopyLinkedFiles(linkedNoteContent); // Recursively parse the linked note
                    } else {
                        console.error(`Note '${noteFilePath}' does not exist.`);
                    }
                }));
            }
        }

        // Start recursively parsing and copying linked files from the main file
        await parseAndCopyLinkedFiles(data);

    } catch (err) {
        console.error('Error copying file:', err);
    }
}

// Initialize chokidar to watch for changes in the source directory
const watcher = chokidar.watch(sourceDirectory, {
    ignored: /(^|[/\\])\../, // Ignore dotfiles
    persistent: true
});

// Watch for changes to files matching the filename pattern
watcher.on('change', async filePath => {
    if (filenamePattern.test(path.basename(filePath))) {
        await copyFileAndMedia(filePath);
    }
});

// Watch for addition of files matching the filename pattern
watcher.on('add', async filePath => {
    if (filenamePattern.test(path.basename(filePath))) {
        await copyFileAndMedia(filePath);
    }
});

console.log(`Watching directory '${sourceDirectory}' for changes...`);
