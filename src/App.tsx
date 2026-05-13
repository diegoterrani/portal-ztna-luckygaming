/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { ExternalLink, ShieldCheck, LayoutDashboard, Database, Gamepad2, Lock } from "lucide-react";

interface AppCardProps {
  name: string;
  url: string;
  image: string;
  icon: React.ReactNode;
  index: number;
}

const AppCard = ({ name, url, image, icon, index }: AppCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      id={`card-${index}`}
      className="glass rounded-2xl overflow-hidden card-hover flex flex-col h-full group"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/90 to-transparent" />
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <div className="p-2 rounded-lg bg-lucky-green/20 border border-lucky-green/30 backdrop-blur-md">
            {icon}
          </div>
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-display font-semibold mb-2 group-hover:text-lucky-green transition-colors">
          {name}
        </h3>
        <p className="text-gray-400 text-sm mb-6 line-clamp-2">
          Ambiente seguro protegido por Zero Trust Access. Clique no botão abaixo para autenticar e acessar o sistema.
        </p>
        
        <div className="mt-auto">
          <a
            href={url.startsWith('http') ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            id={`btn-${index}`}
            className="inline-flex items-center justify-center w-full gap-2 px-6 py-3 bg-white text-bg-dark font-semibold rounded-xl hover:bg-lucky-green hover:text-white transition-all duration-300 active:scale-[0.98]"
          >
            Acessar Aplicação
            <ExternalLink size={18} />
          </a>
        </div>
      </div>
    </motion.div>
  );
};

const LuckyLogo = () => (
  <div className="flex items-center gap-2">
    <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 5L93.3 30V70L50 95L6.7 70V30L50 5Z" stroke="#3dbb87" strokeWidth="8" />
      <path d="M30 40V70H50V80H20V30H70V40H30Z" fill="#3dbb87" />
      <path d="M50 50H80V70H50V50Z" fill="#3dbb87" />
    </svg>
    <div className="flex items-baseline font-display text-2xl font-bold tracking-tighter uppercase italic">
      <span className="text-lucky-green">LUCKY</span>
      <span className="text-lucky-red ml-1">GAMING</span>
    </div>
  </div>
);

export default function App() {
  const apps = [
    {
      name: "PAGOL - Backoffice",
      url: "back.pagol.bet.br",
      image: "https://picsum.photos/seed/pagol/800/600",
      icon: <Database className="text-lucky-green" size={20} />
    },
    {
      name: "4PLAY - Backoffice",
      url: "https://admin-4play.inplaysoft.com.br/login",
      image: "https://picsum.photos/seed/admin4play/800/600",
      icon: <LayoutDashboard className="text-lucky-green" size={20} />
    },
    {
      name: "4PLAY.GAME - Backoffice",
      url: "https://bko.4play.game/",
      image: "https://picsum.photos/seed/bko4play/800/600",
      icon: <ShieldCheck className="text-lucky-green" size={20} />
    },
    {
      name: "4PLAY.GAME",
      url: "https://4play.game/",
      image: "https://picsum.photos/seed/gaming4play/800/600",
      icon: <Gamepad2 className="text-lucky-green" size={20} />
    }
  ];

  return (
    <div className="min-h-screen selection:bg-lucky-green selection:text-white">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-lucky-green/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-lucky-red/10 blur-[120px] rounded-full" />
      </div>

      <header className="fixed top-0 left-0 right-0 z-50 glass border-x-0 border-t-0 py-4">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LuckyLogo />
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded bg-lucky-green/10 border border-lucky-green/20">
              <div className="w-1.5 h-1.5 rounded-full bg-lucky-green animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-tighter text-lucky-green">Sistemas Online</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-lucky-green">
            <Lock size={14} />
            Zero Trust Architecture
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lucky-green/10 border border-lucky-green/20 text-lucky-green text-xs font-bold uppercase tracking-wider mb-6"
            >
              <ShieldCheck size={14} />
              Acesso Restrito
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-6xl font-display font-bold mb-6 tracking-tight"
            >
              Portal de Acesso <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lucky-green to-white">
                Zero Trust Network
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-gray-400 text-lg max-w-2xl mx-auto"
            >
              Selecione o sistema que deseja acessar. Todas as conexões são monitoradas 
              e protegidas por criptografia de ponta a ponta.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {apps.map((app, index) => (
              <AppCard key={app.name} {...app} index={index} />
            ))}
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-sm"
          >
            <p>© 2026 LUCKY GAMING Architecture. Todos os direitos reservados.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-lucky-green transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-lucky-green transition-colors">Segurança</a>
              <a href="#" className="hover:text-lucky-green transition-colors">Contato</a>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
