import { motion, type HTMLMotionProps } from "framer-motion";
import { staggerContainer } from "@/lib/motionVariants";
import { type ReactNode } from "react";

interface MotionWrapperProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
}

/** Stagger-container that reveals children sequentially. */
const MotionWrapper = ({ children, className, ...rest }: MotionWrapperProps) => (
  <motion.div
    variants={staggerContainer}
    initial="hidden"
    animate="visible"
    className={className}
    {...rest}
  >
    {children}
  </motion.div>
);

export default MotionWrapper;
