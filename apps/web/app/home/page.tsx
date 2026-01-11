import { Wrench, BarChart3, FileText, Clock, Shield, Zap, TrendingUp, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200/5 to-gray-300/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(156,163,175,0.1),transparent)]"></div>
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-full mb-6 shadow-lg shadow-gray-500/50">
              <Wrench className="w-5 h-5" />
              <span className="text-sm font-semibold">Plateforme GMAO Intelligente</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 bg-clip-text text-transparent mb-6">
              Gestion de Maintenance Assistée par Ordinateur
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Une solution complète et intelligente pour optimiser la gestion de votre maintenance industrielle avec l'IA
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/home/OT-creator"
                className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-gray-500/50 hover:scale-105 transition-all duration-300"
              >
                Créer un Ordre de Travail
              </Link>
              <Link
                href="/home/AMDEC"
                className="px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold border-2 border-gray-400 hover:bg-gray-600 hover:text-white hover:shadow-lg hover:shadow-gray-500/50 transition-all duration-300"
              >
                Analyse AMDEC
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-700 mb-4">Fonctionnalités Principales</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Des outils puissants pour gérer efficacement votre maintenance
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white backdrop-blur-sm rounded-2xl shadow-xl border border-gray-300 p-8 hover:shadow-2xl hover:shadow-gray-400/20 hover:border-gray-400 transition-all duration-300 hover:scale-105 card-hover">
              <div className="w-14 h-14 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-gray-500/50">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-3">Ordres de Travail IA</h3>
              <p className="text-gray-600 mb-4">
                Création automatique d'ordres de travail avec descriptions générées par intelligence artificielle
              </p>
              <Link href="/home/OT-creator" className="text-gray-600 font-semibold hover:text-gray-800 inline-flex items-center gap-2">
                Créer un OT <span>→</span>
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="bg-white backdrop-blur-sm rounded-2xl shadow-xl border border-gray-300 p-8 hover:shadow-2xl hover:shadow-gray-400/20 hover:border-gray-400 transition-all duration-300 hover:scale-105 card-hover">
              <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-gray-600/50">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-3">Analyse AMDEC</h3>
              <p className="text-gray-600 mb-4">
                Analyse des modes de défaillance avec prédictions IA et génération de rapports AMDEC complets
              </p>
              <Link href="/home/AMDEC" className="text-gray-600 font-semibold hover:text-gray-800 inline-flex items-center gap-2">
                Analyser <span>→</span>
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="bg-white backdrop-blur-sm rounded-2xl shadow-xl border border-gray-300 p-8 hover:shadow-2xl hover:shadow-gray-400/20 hover:border-gray-400 transition-all duration-300 hover:scale-105 card-hover">
              <div className="w-14 h-14 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-gray-500/50">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-3">Planification Maintenance</h3>
              <p className="text-gray-600 mb-4">
                Prévisions de maintenance basées sur l'analyse AMDEC avec calendrier et probabilités
              </p>
              <Link href="/home/maintenance/plan" className="text-gray-600 font-semibold hover:text-gray-800 inline-flex items-center gap-2">
                Voir le calendrier <span>→</span>
              </Link>
            </div>

            {/* Feature 4 */}
            <div className="bg-white backdrop-blur-sm rounded-2xl shadow-xl border border-gray-300 p-8 hover:shadow-2xl hover:shadow-gray-400/20 hover:border-gray-400 transition-all duration-300 hover:scale-105 card-hover">
              <div className="w-14 h-14 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-gray-400/50">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-3">Analyse des Données</h3>
              <p className="text-gray-600 mb-4">
                Tableaux de bord interactifs et rapports détaillés pour suivre les performances
              </p>
              <Link href="/home/data-section" className="text-gray-600 font-semibold hover:text-gray-800 inline-flex items-center gap-2">
                Visualiser <span>→</span>
              </Link>
            </div>

            {/* Feature 5 */}
            <div className="bg-white backdrop-blur-sm rounded-2xl shadow-xl border border-gray-300 p-8 hover:shadow-2xl hover:shadow-gray-400/20 hover:border-gray-400 transition-all duration-300 hover:scale-105 card-hover">
              <div className="w-14 h-14 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-gray-500/50">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-3">Suivi en Temps Réel</h3>
              <p className="text-gray-600 mb-4">
                Surveillance continue de l'état des équipements et alertes automatiques
              </p>
              <span className="text-gray-500/70 font-semibold inline-flex items-center gap-2">
                Bientôt disponible
              </span>
            </div>

            {/* Feature 6 */}
            <div className="bg-white backdrop-blur-sm rounded-2xl shadow-xl border border-gray-300 p-8 hover:shadow-2xl hover:shadow-gray-400/20 hover:border-gray-400 transition-all duration-300 hover:scale-105 card-hover">
              <div className="w-14 h-14 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-gray-500/50">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-3">Maintenance Prédictive</h3>
              <p className="text-gray-600 mb-4">
                Prévision des pannes grâce à l'apprentissage automatique et l'analyse prédictive
              </p>
              <span className="text-gray-500/70 font-semibold inline-flex items-center gap-2">
                Bientôt disponible
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-white via-gray-50 to-white border-y border-gray-300">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2 text-gray-700">100%</div>
              <div className="text-gray-600">Automatisé</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2 text-gray-700">50%</div>
              <div className="text-gray-600">Réduction des Pannes</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2 text-gray-700">IA</div>
              <div className="text-gray-600">Powered</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2 text-gray-700">24/7</div>
              <div className="text-gray-600">Disponibilité</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-700 mb-4">Pourquoi Choisir Notre GMAO?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Une solution moderne qui répond aux défis de la maintenance industrielle
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-gray-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Intelligence Artificielle Intégrée</h3>
                <p className="text-gray-600">
                  Génération automatique de descriptions, analyse prédictive et recommandations intelligentes
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-gray-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Interface Moderne et Intuitive</h3>
                <p className="text-gray-600">
                  Design épuré et facile à utiliser, accessible sur tous les appareils
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-gray-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Exportation PDF Professionnelle</h3>
                <p className="text-gray-600">
                  Générez des rapports et documents prêts à l'emploi en un clic
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-gray-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Analyse Complète des Défaillances</h3>
                <p className="text-gray-600">
                  AMDEC automatisée avec calculs de criticité et actions correctives suggérées
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-white via-gray-50 to-white border-t border-gray-300">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-gray-700 mb-6">
            Prêt à Optimiser Votre Maintenance?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Commencez dès maintenant avec notre plateforme GMAO intelligente
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/home/OT-creator"
              className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-gray-500/50 hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Créer un Ordre de Travail
            </Link>
            <Link
              href="/home/AMDEC"
              className="px-8 py-4 bg-white border-2 border-gray-400 text-gray-700 rounded-xl font-semibold hover:bg-gray-600 hover:text-white hover:shadow-xl hover:shadow-gray-500/50 hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
            >
              <Shield className="w-5 h-5" />
              Analyse AMDEC
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}