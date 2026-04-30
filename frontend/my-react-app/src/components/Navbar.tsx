import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, ArrowLeft } from 'lucide-react';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isUploadPath = location.pathname === '/upload';
  const isLoginPath = location.pathname === '/login';

  const handleUploadClick = () => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
      navigate('/upload');
    } else {
      navigate('/login');
    }
  };

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="landing-nav"
    >
      <div className="nav-container">
        <div className="nav-brand" onClick={() => navigate('/')}>

          <div className="brand-text">
            <span className="uppercase tracking-wider text-[16px] ">SheetSense</span>
            <span className="text-zinc-500 font-thin tracking-wide text-xs ">Powered by InvisibleCTO</span>
          </div>
        </div>

        {isUploadPath ? (
          <button
            className="nav-upload-cta !ml-2 lg:!px-5 lg:!py-2.5 lg:!text-[14px] md:!px-4 md:!py-2 md:!text-[13px] !rounded-lg !px-2 !py-2 !text-[12px] !gap-1"
            style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }}
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={12} />
            <span>Back to Home</span>
          </button>
        ) : isLoginPath ? (
          <button
            className="nav-upload-cta lg:!px-5 !ml-2 lg:!py-2.5 lg:!text-[14px] md:!px-4 md:!py-2 md:!text-[13px] !rounded-lg !px-2 !py-2 !text-[12px] !gap-1"
            style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }}
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={12} />
            <span>Back to Home</span>
          </button>
        ) : (
          <button
            className="nav-upload-cta lg:!px-5 !ml-2 lg:!py-2.5 lg:!text-[14px] md:!px-4 md:!py-2 md:!text-[13px] !px-2 !rounded-lg !py-2 !text-[12px] !gap-1"
            onClick={handleUploadClick}
          >
            <Upload size={12} />
            <span>Upload Report</span>
          </button>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
