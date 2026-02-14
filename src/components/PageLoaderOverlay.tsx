import { motion } from "framer-motion";
import { Coffee } from "lucide-react";
import {
  overlayVariants,
  overlayLogoVariants,
  progressVariants,
} from "@/lib/motionVariants";

const PageLoaderOverlay = () => {
  return (
    <motion.div
      key="page-loader"
      variants={overlayVariants}
      initial="visible"
      exit="exit"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-coffee-900"
      aria-live="polite"
      aria-label="Loading"
    >
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(25_47%_25%/0.4)_0%,transparent_70%)]" />

      <motion.div
        variants={overlayLogoVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative flex flex-col items-center gap-4"
      >
        <Coffee className="w-12 h-12 text-cream-400" />
        <h1 className="font-playfair text-3xl md:text-4xl font-bold text-cream-100 tracking-wide">
          NAWA CAFÉ
        </h1>
      </motion.div>

      {/* Progress bar */}
      <div className="relative mt-8 w-48 h-0.5 bg-cream-400/20 rounded-full overflow-hidden">
        <motion.div
          variants={progressVariants}
          initial="initial"
          animate="animate"
          className="absolute inset-0 bg-cream-400 origin-left rounded-full"
        />
      </div>
    </motion.div>
  );
};

export default PageLoaderOverlay;
