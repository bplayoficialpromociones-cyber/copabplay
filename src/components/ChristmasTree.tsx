export default function ChristmasTree() {
  return (
    <div className="christmas-tree-container">
      <div className="tree-wrapper">
        {/* Star on top */}
        <div className="star-top">
          <div className="star-inner">⭐</div>
        </div>

        {/* Tree sections */}
        <div className="tree-section tree-section-1">
          <div className="tree-layer"></div>
        </div>
        <div className="tree-section tree-section-2">
          <div className="tree-layer"></div>
        </div>
        <div className="tree-section tree-section-3">
          <div className="tree-layer"></div>
        </div>
        <div className="tree-section tree-section-4">
          <div className="tree-layer"></div>
        </div>

        {/* Christmas lights */}
        <div className="light light-1 light-red"></div>
        <div className="light light-2 light-gold"></div>
        <div className="light light-3 light-blue"></div>
        <div className="light light-4 light-red"></div>
        <div className="light light-5 light-gold"></div>
        <div className="light light-6 light-blue"></div>
        <div className="light light-7 light-red"></div>
        <div className="light light-8 light-gold"></div>
        <div className="light light-9 light-blue"></div>
        <div className="light light-10 light-red"></div>
        <div className="light light-11 light-gold"></div>
        <div className="light light-12 light-blue"></div>
        <div className="light light-13 light-red"></div>
        <div className="light light-14 light-gold"></div>
        <div className="light light-15 light-blue"></div>

        {/* Ornaments */}
        <div className="ornament ornament-1"></div>
        <div className="ornament ornament-2"></div>
        <div className="ornament ornament-3"></div>
        <div className="ornament ornament-4"></div>
        <div className="ornament ornament-5"></div>
        <div className="ornament ornament-6"></div>

        {/* Tree trunk */}
        <div className="tree-trunk"></div>

        {/* Glowing base */}
        <div className="tree-glow"></div>
      </div>

      <style>{`
        .christmas-tree-container {
          position: fixed;
          right: 20px;
          bottom: 100px;
          z-index: 1;
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .christmas-tree-container {
            right: 10px;
            bottom: 80px;
            transform: scale(0.7);
          }
        }

        @media (max-width: 1200px) {
          .christmas-tree-container {
            right: 10px;
            bottom: 80px;
            transform: scale(0.8);
          }
        }

        .tree-wrapper {
          position: relative;
          width: 180px;
          height: 280px;
          filter: drop-shadow(0 0 20px rgba(0, 255, 135, 0.3));
        }

        /* Star on top */
        .star-top {
          position: absolute;
          top: -15px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          animation: starPulse 2s ease-in-out infinite;
        }

        .star-inner {
          font-size: 36px;
          filter: drop-shadow(0 0 10px gold) drop-shadow(0 0 20px gold);
        }

        @keyframes starPulse {
          0%, 100% { transform: translateX(-50%) scale(1) rotate(0deg); }
          50% { transform: translateX(-50%) scale(1.2) rotate(180deg); }
        }

        /* Tree sections */
        .tree-section {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .tree-layer {
          width: 0;
          height: 0;
          border-left: 60px solid transparent;
          border-right: 60px solid transparent;
          border-bottom: 70px solid #0d5c2f;
          position: relative;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }

        .tree-layer::before {
          content: '';
          position: absolute;
          width: 0;
          height: 0;
          border-left: 55px solid transparent;
          border-right: 55px solid transparent;
          border-bottom: 65px solid #0f7a3d;
          top: 5px;
          left: -55px;
        }

        .tree-layer::after {
          content: '';
          position: absolute;
          width: 0;
          height: 0;
          border-left: 50px solid transparent;
          border-right: 50px solid transparent;
          border-bottom: 60px solid #11994a;
          top: 10px;
          left: -50px;
        }

        .tree-section-1 { top: 30px; }
        .tree-section-1 .tree-layer {
          border-left: 40px solid transparent;
          border-right: 40px solid transparent;
          border-bottom: 50px solid #0d5c2f;
        }

        .tree-section-2 { top: 70px; }
        .tree-section-2 .tree-layer {
          border-left: 55px solid transparent;
          border-right: 55px solid transparent;
          border-bottom: 60px solid #0d5c2f;
        }

        .tree-section-3 { top: 115px; }
        .tree-section-3 .tree-layer {
          border-left: 70px solid transparent;
          border-right: 70px solid transparent;
          border-bottom: 70px solid #0d5c2f;
        }

        .tree-section-4 { top: 165px; }
        .tree-section-4 .tree-layer {
          border-left: 85px solid transparent;
          border-right: 85px solid transparent;
          border-bottom: 80px solid #0d5c2f;
        }

        /* Tree trunk */
        .tree-trunk {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 30px;
          height: 35px;
          background: linear-gradient(to bottom, #6b4423, #4a2f1a);
          border-radius: 2px;
          box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.3);
        }

        /* Glowing base effect */
        .tree-glow {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          height: 30px;
          background: radial-gradient(ellipse, rgba(0, 255, 135, 0.3), transparent);
          filter: blur(10px);
          animation: glowPulse 3s ease-in-out infinite;
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        /* Christmas lights */
        .light {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          z-index: 10;
          animation: lightBlink 1.5s ease-in-out infinite;
        }

        .light-red {
          background: radial-gradient(circle, #ff4444, #cc0000);
          box-shadow: 0 0 10px #ff4444, 0 0 20px #ff4444, 0 0 30px #ff0000;
        }

        .light-gold {
          background: radial-gradient(circle, #ffd700, #ffaa00);
          box-shadow: 0 0 10px #ffd700, 0 0 20px #ffd700, 0 0 30px #ffaa00;
          animation-delay: 0.5s;
        }

        .light-blue {
          background: radial-gradient(circle, #4da6ff, #0066cc);
          box-shadow: 0 0 10px #4da6ff, 0 0 20px #4da6ff, 0 0 30px #0066cc;
          animation-delay: 1s;
        }

        @keyframes lightBlink {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(0.9);
          }
        }

        /* Light positions */
        .light-1 { top: 45px; left: 60px; }
        .light-2 { top: 50px; left: 110px; }
        .light-3 { top: 85px; left: 45px; }
        .light-4 { top: 90px; left: 125px; }
        .light-5 { top: 80px; left: 85px; }
        .light-6 { top: 130px; left: 35px; }
        .light-7 { top: 125px; left: 145px; }
        .light-8 { top: 135px; left: 90px; }
        .light-9 { top: 175px; left: 25px; }
        .light-10 { top: 170px; left: 155px; }
        .light-11 { top: 180px; left: 90px; }
        .light-12 { top: 165px; left: 115px; }
        .light-13 { top: 220px; left: 15px; }
        .light-14 { top: 215px; left: 165px; }
        .light-15 { top: 225px; left: 90px; }

        /* Ornaments (baubles) */
        .ornament {
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          z-index: 9;
          animation: ornamentSwing 3s ease-in-out infinite;
        }

        .ornament-1 {
          top: 60px;
          left: 75px;
          background: radial-gradient(circle at 30% 30%, #ff6b9d, #c9184a);
          box-shadow: inset -2px -2px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(255, 107, 157, 0.6);
        }

        .ornament-2 {
          top: 95px;
          left: 105px;
          background: radial-gradient(circle at 30% 30%, #4ecdc4, #006d77);
          box-shadow: inset -2px -2px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(78, 205, 196, 0.6);
          animation-delay: 0.5s;
        }

        .ornament-3 {
          top: 145px;
          left: 55px;
          background: radial-gradient(circle at 30% 30%, #ffd93d, #d4a017);
          box-shadow: inset -2px -2px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(255, 217, 61, 0.6);
          animation-delay: 1s;
        }

        .ornament-4 {
          top: 150px;
          left: 125px;
          background: radial-gradient(circle at 30% 30%, #a8dadc, #457b9d);
          box-shadow: inset -2px -2px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(168, 218, 220, 0.6);
          animation-delay: 1.5s;
        }

        .ornament-5 {
          top: 195px;
          left: 70px;
          background: radial-gradient(circle at 30% 30%, #ff6b9d, #c9184a);
          box-shadow: inset -2px -2px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(255, 107, 157, 0.6);
          animation-delay: 2s;
        }

        .ornament-6 {
          top: 190px;
          left: 140px;
          background: radial-gradient(circle at 30% 30%, #4ecdc4, #006d77);
          box-shadow: inset -2px -2px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(78, 205, 196, 0.6);
          animation-delay: 2.5s;
        }

        @keyframes ornamentSwing {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}</style>
    </div>
  );
}
