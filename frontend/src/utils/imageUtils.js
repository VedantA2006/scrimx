/**
 * Converts a given File object to a Base64 encoded string.
 * @param {File} file - The file to convert.
 * @returns {Promise<string>} A promise that resolves to the Base64 string.
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result);
    };
    reader.onerror = (err) => {
      reject(err);
    };
    if (file) {
      reader.readAsDataURL(file);
    } else {
      resolve('');
    }
  });
};
