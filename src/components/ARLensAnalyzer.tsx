import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDrishtiStore, ARNode } from '../state/drishtiStore';
import { speechService } from '../speech/speechService';
import { SUPPORTED_LANGUAGES } from '../speech/languages';
import { playEarconReady } from '../audio/earcons';
import { Haptics } from '../audio/haptics';

interface ARLensAnalyzerProps {
  onNodeSelect?: (node: ARNode) => void;
}

export const ARLensAnalyzer: React.FC<ARLensAnalyzerProps> = ({ onNodeSelect }) => {
  const {
    arNodes,
    activeArNode,
    setActiveArNode,
    isARAnalyzerEnabled,
    arFilter,
    setARFilter,
    language,
    speechRate
  } = useDrishtiStore();

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  if (!isARAnalyzerEnabled) return null;

  const langConfig = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.hi;

  // Filter nodes according to selected category
  const filteredNodes = arNodes.filter((node) => {
    if (arFilter === 'all') return true;
    if (arFilter === 'hazard') return node.category === 'hazard';
    if (arFilter === 'currency') return node.category === 'currency';
    if (arFilter === 'text') return node.category === 'text';
    if (arFilter === 'object') return node.category === 'object' || node.category === 'color';
    return true;
  });

  const handleNodeClick = (node: ARNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveArNode(node);
    playEarconReady();
    Haptics.tap();

    onNodeSelect?.(node);

    // Speak this specific AR entity out loud
    const textToSpeak = language === 'hi'
      ? `${node.labelNative}${node.details ? `। ${node.details}` : ''}`
      : `${node.label}${node.details ? `. ${node.details}` : ''}`;

    speechService.speak(textToSpeak, langConfig.locale, {
      rate: speechRate,
      priority: node.category === 'hazard' ? 'urgent' : 'normal'
    });
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'hazard':
        return {
          color: '#FF9F0A',
          bgColor: 'rgba(255, 159, 10, 0.25)',
          borderColor: '#FF9F0A',
          icon: '⚠️',
          badge: 'HAZARD'
        };
      case 'currency':
        return {
          color: '#64D2FF',
          bgColor: 'rgba(100, 210, 255, 0.25)',
          borderColor: '#64D2FF',
          icon: '💵',
          badge: 'CURRENCY'
        };
      case 'text':
        return {
          color: '#5E5CE6',
          bgColor: 'rgba(94, 92, 230, 0.25)',
          borderColor: '#A3A1F7',
          icon: '📝',
          badge: 'OCR TEXT'
        };
      case 'color':
        return {
          color: '#FFD60A',
          bgColor: 'rgba(255, 214, 10, 0.25)',
          borderColor: '#FFD60A',
          icon: '🎨',
          badge: 'COLOR'
        };
      default:
        return {
          color: '#FFFFFF',
          bgColor: 'rgba(255, 255, 255, 0.2)',
          borderColor: 'rgba(255, 255, 255, 0.6)',
          icon: '🔍',
          badge: 'OBJECT'
        };
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
      {/* 1. Google Lens Central Target Reticle [   ] */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.04, 1],
            opacity: [0.65, 0.9, 0.65]
          }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-64 h-64 sm:w-80 sm:h-80 border-2 border-dashed border-white/20 rounded-3xl flex items-center justify-center"
        >
          {/* Corner brackets */}
          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#64D2FF] rounded-tl-xl" />
          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#64D2FF] rounded-tr-xl" />
          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#64D2FF] rounded-bl-xl" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#64D2FF] rounded-br-xl" />

          {/* Center aiming reticle crosshair */}
          <div className="w-3 h-3 rounded-full bg-[#64D2FF]/60 animate-ping" />
          <div className="absolute w-1.5 h-1.5 rounded-full bg-white" />
        </motion.div>
      </div>

      {/* 2. Google Lens Animated Scan Laser Bar */}
      <motion.div
        animate={{ y: ['0vh', '85vh', '0vh'] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#64D2FF] to-transparent shadow-[0_0_15px_#64D2FF] opacity-70 pointer-events-none"
      />

      {/* 3. AR Filter Chips (Google Lens Mode Selector) */}
      <div className="absolute top-18 left-4 right-4 flex items-center justify-center gap-1.5 pointer-events-auto overflow-x-auto py-1 scrollbar-none">
        {[
          { key: 'all', label: 'All', icon: '✨' },
          { key: 'hazard', label: 'Hazards', icon: '⚠️' },
          { key: 'currency', label: 'Currency', icon: '💵' },
          { key: 'text', label: 'Text (OCR)', icon: '📝' },
          { key: 'object', label: 'Objects', icon: '🪑' }
        ].map((tab) => {
          const isSelected = arFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={(e) => {
                e.stopPropagation();
                setARFilter(tab.key as any);
                Haptics.tap();
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 backdrop-blur-md transition-all whitespace-nowrap border ${
                isSelected
                  ? 'bg-[#64D2FF] text-[#05070F] border-white shadow-lg shadow-[#64D2FF]/30 scale-105'
                  : 'bg-black/40 text-white/80 border-white/15 hover:bg-black/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Spatial AR Nodes & Bounding Boxes Overlay */}
      {filteredNodes.map((node) => {
        const theme = getCategoryTheme(node.category);
        const [centerY, centerX] = node.centerPoint;
        const isHovered = hoveredNodeId === node.id || activeArNode?.id === node.id;

        // Bounding box coordinates in %
        let boxStyle: React.CSSProperties = {};
        if (node.box2d && node.box2d.length === 4) {
          const [ymin, xmin, ymax, xmax] = node.box2d;
          boxStyle = {
            top: `${ymin / 10}%`,
            left: `${xmin / 10}%`,
            width: `${Math.max(10, (xmax - xmin) / 10)}%`,
            height: `${Math.max(8, (ymax - ymin) / 10)}%`
          };
        }

        return (
          <React.Fragment key={node.id}>
            {/* 4A. Google Lens Spatial Bounding Box */}
            {node.box2d && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: isHovered ? 1 : 0.6,
                  scale: isHovered ? 1.02 : 1
                }}
                transition={{ duration: 0.3 }}
                className="absolute pointer-events-none rounded-2xl border-2 transition-all"
                style={{
                  ...boxStyle,
                  borderColor: theme.borderColor,
                  backgroundColor: isHovered ? theme.bgColor : 'transparent',
                  boxShadow: isHovered ? `0 0 25px ${theme.color}` : 'none'
                }}
              >
                {/* Neon Corner Accents */}
                <span
                  className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 rounded-tl"
                  style={{ borderColor: theme.color }}
                />
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 rounded-tr"
                  style={{ borderColor: theme.color }}
                />
                <span
                  className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 rounded-bl"
                  style={{ borderColor: theme.color }}
                />
                <span
                  className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 rounded-br"
                  style={{ borderColor: theme.color }}
                />
              </motion.div>
            )}

            {/* 4B. Google Lens Pulsing AR Pin Dot */}
            <motion.div
              style={{
                top: `${centerY}%`,
                left: `${centerX}%`,
                transform: 'translate(-50%, -50%)'
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [1, 1.08, 1],
                opacity: 1
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="absolute pointer-events-auto cursor-pointer z-30 group"
              onClick={(e) => handleNodeClick(node, e)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              {/* Outer Pulse Rings */}
              <div
                className="absolute -inset-3 rounded-full animate-ping opacity-40 pointer-events-none"
                style={{ backgroundColor: theme.color }}
              />
              <div
                className="absolute -inset-1.5 rounded-full animate-pulse opacity-60 pointer-events-none"
                style={{ backgroundColor: theme.color }}
              />

              {/* Central Glowing Core Dot */}
              <div
                className="relative w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-xl border-2 border-white text-black font-extrabold transition-transform active:scale-90"
                style={{ backgroundColor: theme.color }}
              >
                <span>{theme.icon}</span>
              </div>

              {/* Floating Badge Tag (Like Google Lens Pin Label) */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute left-1/2 -translate-x-1/2 top-9 whitespace-nowrap pointer-events-none"
              >
                <div className="glass-surface px-2.5 py-1 rounded-xl border border-white/20 shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
                  <span
                    className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: theme.bgColor, color: theme.color }}
                  >
                    {theme.badge}
                  </span>
                  <span className="text-xs font-bold text-white max-w-[140px] truncate">
                    {language === 'hi' ? node.labelNative : node.label}
                  </span>
                  <span className="text-[10px] font-mono text-[#64D2FF]">
                    {Math.round(node.confidence * 100)}%
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </React.Fragment>
        );
      })}

      {/* 5. Active Inspect Modal Card when an AR node is tapped */}
      <AnimatePresence>
        {activeArNode && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-32 left-4 right-4 max-w-md mx-auto pointer-events-auto z-40"
          >
            <div className="glass-surface p-4 rounded-3xl border border-[#64D2FF]/40 shadow-2xl flex items-start justify-between gap-3 bg-black/35 backdrop-blur-md">
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: getCategoryTheme(activeArNode.category).bgColor }}
                >
                  {getCategoryTheme(activeArNode.category).icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: getCategoryTheme(activeArNode.category).bgColor,
                        color: getCategoryTheme(activeArNode.category).color
                      }}
                    >
                      {getCategoryTheme(activeArNode.category).badge}
                    </span>
                    <span className="text-xs font-mono text-[#64D2FF]">
                      Confidence: {Math.round(activeArNode.confidence * 100)}%
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1 leading-snug">
                    {language === 'hi' ? activeArNode.labelNative : activeArNode.label}
                  </h3>
                  {activeArNode.details && (
                    <p className="text-xs text-[#C7D2E8] mt-0.5">
                      {activeArNode.details}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => {
                    const text = language === 'hi'
                      ? `${activeArNode.labelNative}। ${activeArNode.details || ''}`
                      : `${activeArNode.label}. ${activeArNode.details || ''}`;
                    speechService.speak(text, langConfig.locale, { rate: speechRate });
                  }}
                  className="p-2 rounded-xl bg-[#64D2FF] text-[#05070F] text-xs font-bold active:scale-90"
                  title="Speak again"
                  aria-label="Speak entity"
                >
                  🔊 Speak
                </button>
                <button
                  onClick={() => setActiveArNode(null)}
                  className="p-2 rounded-xl bg-white/10 text-white text-xs font-bold active:scale-90 text-center"
                  aria-label="Close card"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
