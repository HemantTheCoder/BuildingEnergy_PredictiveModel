import { motion } from 'framer-motion';

export default function SplashScreen() {
    return (
        <div className="fixed inset-0 bg-[#eff2f7] z-50 flex flex-col items-center justify-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex flex-col items-center"
            >
                <img 
                    src="/logo.png" 
                    alt="ClimaBuild AI Logo" 
                    className="w-56 h-auto object-contain drop-shadow-xl" 
                />
                <div className="w-48 h-1.5 bg-slate-300/50 rounded-full overflow-hidden mt-12 shadow-inner">
                    <motion.div 
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 3, ease: "easeInOut" }}
                        className="h-full bg-primary rounded-full"
                    />
                </div>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="mt-6 text-sm font-bold text-primary tracking-widest uppercase"
                >
                    Initializing Intelligence...
                </motion.p>
            </motion.div>
        </div>
    );
}
