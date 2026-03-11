'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { playSoundIfEnabled } from '@/lib/sounds'

interface LoadingScreenProps {
  progress: number
  className?: string
}

// Eye loading GIF URL - use local GIF file for animation
const EYE_LOADING_GIF = "/images/eyeloading.gif"

// Individual rolling digit component with smooth spring animation
function RollingDigit({ digit, className, playSound = false }: { digit: string; className?: string; playSound?: boolean }) {
  const numericDigit = digit === '%' ? 10 : parseInt(digit, 10)
  const prevDigitRef = useRef(numericDigit)
  
  useEffect(() => {
    if (playSound && prevDigitRef.current !== numericDigit) {
      playSoundIfEnabled('soft')
      prevDigitRef.current = numericDigit
    }
  }, [numericDigit, playSound])
  
  return (
    <div className={cn("relative h-[1.2em] w-[0.65em] overflow-hidden", className)}>
      <motion.div
        className="flex flex-col"
        initial={false}
        animate={{ y: `${-numericDigit * 1.2}em` }}
        transition={{
          type: "spring",
          stiffness: 180,
          damping: 22,
          mass: 0.8,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, '%'].map((num) => (
          <span
            key={num}
            className="h-[1.2em] flex items-center justify-center"
          >
            {num}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// Percentage display with rolling digits
function RollingPercentage({ value }: { value: number }) {
  const percentage = Math.min(100, Math.max(0, Math.round(value)))
  const digits = percentage.toString().padStart(1, '0').split('')
  
  return (
    <div className="flex items-center justify-center font-mono text-lg tracking-tight text-[var(--muted-foreground)]">
      <AnimatePresence mode="popLayout">
        {digits.map((digit, index) => (
          <motion.div
            key={`${index}-${digits.length}`}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ 
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
          >
            <RollingDigit digit={digit} playSound={index === digits.length - 1} />
          </motion.div>
        ))}
      </AnimatePresence>
      <span className="ml-0.5">%</span>
    </div>
  )
}

export function LoadingScreen({ progress, className }: LoadingScreenProps) {
  return (
    <motion.div 
      className={cn(
        "flex flex-col items-center justify-center gap-0",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
    >
      {/* Eye loading GIF - seamlessly blended with background */}
      <motion.div 
        className="relative w-[90vw] h-[52vw] max-w-[900px] max-h-[520px] sm:w-[800px] sm:h-[460px]"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.6, 
          ease: [0.32, 0.72, 0, 1],
          delay: 0.1 
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={EYE_LOADING_GIF}
          alt="Loading..."
          className="w-full h-full object-contain"
          style={{
            mixBlendMode: 'multiply',
            filter: 'brightness(0.85) contrast(1.08)',
            opacity: 0.9,
            maskImage: 'radial-gradient(ellipse 50% 50% at center, black 0%, black 40%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at center, black 0%, black 40%, transparent 70%)'
          }}
        />
      </motion.div>
      
      {/* Rolling percentage - positioned below the GIF */}
      <motion.div
        className="-mt-6 sm:-mt-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.4, 
          ease: [0.32, 0.72, 0, 1],
          delay: 0.2 
        }}
      >
        <RollingPercentage value={progress} />
      </motion.div>
    </motion.div>
  )
}
