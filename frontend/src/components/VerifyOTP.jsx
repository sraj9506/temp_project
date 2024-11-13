import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const { userId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [otpExpiry, setOtpExpiry] = useState(Date.now() + 120000); // Set expiry to 2 minutes from now
  const [timeLeft, setTimeLeft] = useState(120); // Initialize timer at 120 seconds
  const [resendAvailable, setResendAvailable] = useState(false);
  const [isOtpExpired, setIsOtpExpired] = useState(false); // New state for OTP expiration

  const queryParams = new URLSearchParams(window.location.search);
  const email = queryParams.get('email');

  useEffect(() => {
    const intervalId = setInterval(() => {
      const remainingTime = Math.max(0, otpExpiry - Date.now());
      setTimeLeft(Math.floor(remainingTime / 1000));

      if (remainingTime <= 0) {
        clearInterval(intervalId);
        setResendAvailable(true);
        setIsOtpExpired(true); // Set OTP as expired
        setMessage('OTP has expired. Please request a new OTP.');
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [otpExpiry]);

  const handleVerify = async (e) => {
    e.preventDefault();

    if (isOtpExpired) {
      setMessage('OTP is invalid because it has expired. Please request a new OTP.');
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-otp', { userId, otp });
      alert(res.data.message);
      navigate('/signin'); // Redirect to login page
    } catch (error) {
      console.error('OTP Verification Error:', error);
      setMessage('Invalid OTP');
    }
  };

  const handleResendOTP = async (e) => {
    e.preventDefault();
    setResendAvailable(false);
    setIsOtpExpired(false); // Reset OTP expiration status
    setTimeLeft(120); // Reset timer to 2 minutes
    setOtpExpiry(Date.now() + 120000); // Update expiry time to 2 minutes from now
    setMessage(''); // Clear any previous messages
    try {
      const res = await axios.post('http://localhost:5000/api/auth/resend-otp', { userId });
      setMessage(res.data.message);
    } catch (error) {
      console.error('Resend OTP Error:', error);
      setMessage('Failed to resend OTP');
    }
  };

  return (
    <section className="relative z-10 overflow-hidden pb-16 pt-36 md:pb-20 lg:pb-28 lg:pt-[180px]">
      <div className="container">
        <div className="-mx-4 flex flex-wrap">
          <div className="w-full px-4">
            <div className="shadow-three mx-auto max-w-[500px] rounded bg-white px-6 py-10 dark:bg-dark sm:p-[60px]">
              <h3 className="mb-3 text-center text-2xl font-bold text-black dark:text-white sm:text-3xl">
                Enter Your OTP 
              </h3>
              
              <p className="mb-11 text-center text-base font-medium text-body-color">
                An OTP has been sent to your email address.
              </p>

              <div className="mb-8 flex items-center justify-center">
                <span className="hidden h-[1px] w-full max-w-[70px] bg-body-color/50 sm:block"></span>
                <p className="w-full px-5 text-center text-base font-medium text-body-color">
                  <strong>{email}</strong>
                </p>
                <span className="hidden h-[1px] w-full max-w-[70px] bg-body-color/50 sm:block"></span>
              </div>
              <form onSubmit={handleVerify}>
                <div className="mb-8">
                  <label
                    htmlFor="otp"
                    className="mb-3 block text-sm text-dark dark:text-white"
                  >
                    Your OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 4-digit OTP"
                    required
                    className="border-stroke dark:text-body-color-dark dark:shadow-two w-full rounded-sm border bg-[#f8f8f8] px-6 py-3 text-base text-body-color outline-none transition-all duration-300 focus:border-primary dark:border-transparent dark:bg-[#2C303B] dark:focus:border-primary dark:focus:shadow-none"
                  />
                </div>
                <div className="mb-6">
                  <button
                    className="shadow-submit dark:shadow-submit-dark flex w-full items-center justify-center rounded-sm bg-primary px-9 py-4 text-base font-medium text-white duration-300 hover:bg-primary/90"
                    disabled={isOtpExpired} // Disable if OTP is expired
                  >
                    Verify OTP
                  </button>
                </div>
              </form>
              {message && <p className="text-center text-base font-medium text-body-color">{message}</p>}
              {timeLeft > 0 ? (
                <p className="text-center text-base font-medium text-body-color">
                  OTP expires in: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </p>
              ) : (
                <p className="text-center text-base font-medium text-body-color">
                  <Link to="#" onClick={handleResendOTP} className={`text-primary hover:underline ${!resendAvailable ? 'disabled-link' : ''}`}>
                    Resend OTP
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute left-0 top-0 z-[-1]">
        <svg
          width="1440"
          height="969"
          viewBox="0 0 1440 969"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <mask
            id="mask0_95:1005"
            style={{ maskType: "alpha" }}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1440"
            height="969"
          >
            <rect width="1440" height="969" fill="#090E34" />
          </mask>
          <g mask="url(#mask0_95:1005)">
            <path
              opacity="0.1"
              d="M1086.96 297.978L632.959 554.978L935.625 535.926L1086.96 297.978Z"
              fill="url(#paint0_linear_95:1005)"
            />
            <path
              opacity="0.1"
              d="M1324.5 755.5L1450 687V886.5L1324.5 967.5L-10 288L1324.5 755.5Z"
              fill="url(#paint1_linear_95:1005)"
            />
          </g>
          <defs>
            <linearGradient
              id="paint0_linear_95:1005"
              x1="1178.4"
              y1="151.853"
              x2="780.959"
              y2="453.581"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#4A6CF7" />
              <stop offset="1" stopColor="#4A6CF7" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id="paint1_linear_95:1005"
              x1="160.5"
              y1="220"
              x2="1099.45"
              y2="1192.04"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#4A6CF7" />
              <stop offset="1" stopColor="#4A6CF7" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </section>
  );
};

export default VerifyOTP;
