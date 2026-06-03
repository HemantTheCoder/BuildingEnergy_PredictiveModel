import { motion } from 'framer-motion';

export default function SplashScreen() {
    return (
        <div className="fixed inset-0 bg-[#eff2f7] z-50 flex flex-col items-center justify-center overflow-hidden">
            {/* Ambient glowing background */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1.5 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -z-10"
            />
            
            <div className="relative flex flex-col items-center">
                {/* Floating Logo */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: [0, -10, 0] }}
                    transition={{ 
                        opacity: { duration: 0.8 },
                        y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    }}
                >
                    <img 
                        src="/logo.png" 
                        alt="ClimaBuild AI Logo" 
                        className="w-64 h-auto object-contain drop-shadow-2xl relative z-10" 
                    />
                </motion.div>

                {/* Loading Bar */}
                <div className="w-56 h-[3px] bg-slate-300/40 rounded-full overflow-hidden mt-12 shadow-inner relative">
                    <motion.div 
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 3, ease: "easeInOut" }}
                        className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full shadow-[0_0_10px_rgba(5,44,77,0.5)]"
                    />
                </div>
                
                {/* Animated Text */}
                <motion.p 
                    initial={{ opacity: 0, letterSpacing: "0px" }}
                    animate={{ opacity: 1, letterSpacing: "4px" }}
                    transition={{ delay: 0.5, duration: 2.5, ease: "easeOut" }}
                    className="mt-6 text-xs font-bold text-primary/80 uppercase"
                >
                    Initializing Intelligence
                </motion.p>
            </div>
        </div>
    );
}
