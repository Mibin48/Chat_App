import { UTApi } from "uploadthing/server";

console.log("[UploadThing] Initializing client. Token prefix:", process.env.UPLOADTHING_TOKEN ? `${process.env.UPLOADTHING_TOKEN.substring(0, 15)}...` : "undefined");

export const utapi = new UTApi({
    token: process.env.UPLOADTHING_TOKEN
});

/**
 * Uploads a base64 encoded file to UploadThing
 * @param {string} base64Data - Base64 data string (e.g. data:image/png;base64,...)
 * @param {string} [fileName] - Optional file name
 * @param {string} [fileType] - Optional MIME type
 * @returns {Promise<{ url: string, name: string, type: string, size: number, key: string }>}
 */
export const uploadToUploadThing = async (base64Data, fileName, fileType) => {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    let mime = fileType;

    if (matches && matches.length === 3) {
        mime = matches[1];
        buffer = Buffer.from(matches[2], "base64");
    } else {
        buffer = Buffer.from(base64Data, "base64");
    }

    if (!mime) {
        mime = "application/octet-stream";
        if (fileName) {
            const ext = fileName.split('.').pop().toLowerCase();
            if (ext === 'pdf') mime = 'application/pdf';
            else if (ext === 'png') mime = 'image/png';
            else if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
            else if (ext === 'gif') mime = 'image/gif';
            else if (ext === 'mp4') mime = 'video/mp4';
        }
    }

    const cleanFileName = fileName || `file_${Date.now()}`;
    const file = new File([buffer], cleanFileName, { type: mime });

    const response = await utapi.uploadFiles([file]);
    
    if (response[0]?.error) {
        throw new Error(response[0].error.message || "UploadThing upload failed");
    }

    const data = response[0].data;
    return {
        url: data.ufsUrl || data.url,
        name: data.name,
        type: data.type,
        size: data.size,
        key: data.key
    };
};
