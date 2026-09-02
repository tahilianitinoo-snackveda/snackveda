import { ReactNode } from "react";
import { motion } from "framer-motion";

interface ProductGridProps {
  children: ReactNode;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function ProductGrid({ children }: ProductGridProps) {
  // We need to map over children to apply the item variants
  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
    >
      {/* We assume children are ProductCard elements and we wrap them individually if we needed to, 
          but Framer Motion propagates variants if children are motion components. 
          Our ProductCard is a motion.div but it doesn't use these specific variants automatically.
          For simplicity we'll just render children, as ProductCard has its own hover state.
          Wait, to use stagger, we wrap each child. Let's just use a simple grid here and we can 
          make a wrapper component if needed. Actually, let's just render the grid.
      */}
      {children}
    </motion.div>
  );
}

// Helper wrapper for grid items if needed
export function ProductGridItem({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={item}>
      {children}
    </motion.div>
  );
}
