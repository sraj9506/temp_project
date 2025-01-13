import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';  // Make sure this is the correct import path

function App() {
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isReady, setIsReady] = useState(false);
    const [uploadMessage, setUploadMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const { user, token } = useAuth();  // Correct usage of useContext with AuthContext

    const fetchQrCode = async (clientId) => {
        try {
            const response = await fetch(`http://43.205.236.112:5000/api/whatsapp/qr-code?clientId=${encodeURIComponent(clientId)}`);
            const jsonData = await response.json();
            setQrCodeUrl(jsonData.qr_url);
        } catch (error) {
            console.error("Failed to fetch QR code:", error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchQrCode(user.name);

            const checkReadyStatus = async () => {
                try {
                    const response = await fetch(`http://43.205.236.112:5000/api/whatsapp/status?clientId=${encodeURIComponent(user.name)}`);
                    const jsonData = await response.json();
                    if (jsonData.isReady) {
                        setIsReady(true);
                        clearInterval(intervalId);
                    }
                } catch (error) {
                    console.error("Failed to check client status:", error);
                }
            };

            const intervalId = setInterval(checkReadyStatus, 2000);

            return () => clearInterval(intervalId);
        }
    }, [user]);  // Only trigger this effect when 'user' changes

    const handleLogout = async () => {
        try {
            await fetch(`http://43.205.236.112:5000/api/whatsapp/logout?clientId=${encodeURIComponent(user.name)}`, { method: 'POST' });
            setQrCodeUrl('');
            setIsReady(false);
            fetchQrCode(user.name);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const handleFileUpload = async (event) => {
        event.preventDefault();
        setIsUploading(true);
        setUploadMessage('');

        const formData = new FormData();
        const fileInput = event.target.elements.file;
        if (fileInput.files.length === 0) {
            setUploadMessage('No file selected.');
            setIsUploading(false);
            return;
        }

        formData.append('file', fileInput.files[0]);

        try {
            const response = await fetch(`http://43.205.236.112:5000/api/whatsapp/upload?clientId=${encodeURIComponent(user.name)}`, {
                method: 'POST',
                body: formData,
                headers: {
                    Authorization: `Bearer ${token}`,
                  },
            });

            setUploadMessage(response.ok ? 'File uploaded successfully.' : 'Failed to upload file.');
        } catch (error) {
            console.error("Upload failed:", error);
            setUploadMessage('An error occurred during upload.');
        }

        setIsUploading(false);
    };

    if (!user) {
        return <div>Loading...</div>;  // Optional: handle loading state or redirect if no user is found
    }

    return (
        <section className="py-16 md:py-20 lg:py-28">
            <div className="container">
                <div className="-mx-4 flex flex-wrap items-center">
                    <div className="w-full px-4 lg:w-1/2">
                        <div className="relative mx-auto mb-12 max-w-[500px] text-center lg:m-0">
                            {isReady ? (
                                <>
                                   <h2 className="mb-4 text-3xl font-bold !leading-tight text-black dark:text-white sm:text-4xl md:text-[45px]">Welcome to, {user ? user.name : 'Guest'}!</h2>
                                   <h2 className="mb-7 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                                   You are now connected!
                                    </h2>
                                  
                                    
                                    <div className="max-w-[470px] mt-10">
                                    <form onSubmit={handleFileUpload} className="font-[sans-serif] max-w-md mx-auto mb-9 p-6 border border-blue-500 rounded-lg shadow-lg dark:bg-gray-dark">
  <div className="flex flex-col items-center space-y-4 ">
    {/* File Upload Section */}
    <div className="w-full text-gray-500 font-semibold">
      <label className="text-base mb-2 block">Upload file</label>
      <div className="w-full flex justify-center items-center border-2 border-dashed border-gray-400 rounded-md">
        <input
          type="file"
          name="file"
          disabled={isUploading}
          className="w-full text-gray-400 font-semibold text-sm bg-transparent cursor-pointer p-3 file:border-0 file:bg-transparent file:text-gray-500 file:focus:outline-none file:hover:text-white file:hover:bg-green-500"
        />
      </div>
      <p className="text-xs text-gray-400 mt-2">PNG, JPG, SVG, WEBP, and GIF are Allowed.</p>
    </div>

    {/* Upload Button */}
    <button
      type="submit"
      disabled={isUploading}
      className="flex mt-4 bg-green-500 hover:bg-green-400 text-white text-base px-5 py-3 outline-none rounded-md w-full justify-center items-center space-x-2 cursor-pointer"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 inline" viewBox="0 0 32 32">
        <path
          d="M23.75 11.044a7.99 7.99 0 0 0-15.5-.009A8 8 0 0 0 9 27h3a1 1 0 0 0 0-2H9a6 6 0 0 1-.035-12 1.038 1.038 0 0 0 1.1-.854 5.991 5.991 0 0 1 11.862 0A1.08 1.08 0 0 0 23 13a6 6 0 0 1 0 12h-3a1 1 0 0 0 0 2h3a8 8 0 0 0 .75-15.956z"
        />
        <path
          d="M20.293 19.707a1 1 0 0 0 1.414-1.414l-5-5a1 1 0 0 0-1.414 0l-5 5a1 1 0 0 0 1.414 1.414L15 16.414V29a1 1 0 0 0 2 0V16.414z"
        />
      </svg>
      <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
    </button>
    {uploadMessage && <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">{uploadMessage}</p>}
  </div>
</form>


                                        
                                    </div>
                                    <button onClick={handleLogout} disabled={isUploading} className="mt-4 bg-blue-500 text-white p-2 rounded">
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                     <h2 className="mb-7 mt-5 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                                        Scan This QR Code 
                                    </h2>
                                    {qrCodeUrl ? (
                                        <img src={qrCodeUrl} alt="QR Code" className="mx-auto drop-shadow-lg" />
                                    ) : (
                                        <div class="text-center">
                                            <div role="status">
                                                <svg aria-hidden="true" class="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                                                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                                                </svg>
                                            <span class="sr-only">Loading...</span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    <div className="w-full px-4 lg:w-1/2">
                        <div className="max-w-[470px]">
                            <div className="mb-9">
                                <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                                    Bug-free code
                                </h3>
                                <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                                </p>
                            </div>
                            <div className="mb-9">
                                <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                                    Premier support
                                </h3>
                                <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.
                                </p>
                            </div>
                            <div className="mb-1">
                                <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                                    Next.js
                                </h3>
                                <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                                    Lorem ipsum dolor sit amet, sed do eiusmod tempor incididunt consectetur adipiscing elit setim.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default App;
