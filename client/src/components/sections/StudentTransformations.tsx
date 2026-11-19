import { motion } from "framer-motion";
import {
  INSTAGRAM_TRANSFORMATIONS,
  STUDENT_TRANSFORMATIONS,
  type StudentTransformation,
} from "@/data/studentTransformations";

interface StudentTransformationsSectionProps {
  id?: string;
  showGallery?: boolean;
  showCta?: boolean;
  className?: string;
}

function TransformationCard({ student, index }: { student: StudentTransformation; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: (index % 2) * 0.08 }}
      className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-black/40 backdrop-blur-sm transition-all hover:border-[#FCDD00]/30"
      data-testid={`student-transformation-${student.id}`}
    >
      {student.image && (
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-neutral-950">
          <img
            src={student.image}
            alt={student.imageAlt || `${student.name}, photos avant et après`}
            loading="lazy"
            decoding="async"
            width={966}
            height={640}
            className="h-full w-full object-cover"
          />
          <span className="absolute left-3 top-3 rounded-sm bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-300">
            Avant
          </span>
          <span className="absolute right-3 top-3 rounded-sm bg-[#FCDD00] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black">
            Après
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h3 className="font-sans text-lg font-bold text-white">{student.name}</h3>
            <p className="font-mono text-[11px] uppercase tracking-wider text-gray-500">
              {student.program ? `${student.program} · ` : ""}
              {student.duration}
            </p>
          </div>
          <div className="whitespace-nowrap font-mono text-lg font-bold leading-tight text-[#FCDD00] sm:text-right sm:text-xl">
            {student.headline}
          </div>
        </div>

        <dl className="mb-4 flex flex-wrap gap-2">
          {student.stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2 rounded-full border border-[#FCDD00]/20 bg-[#FCDD00]/5 px-3 py-1"
            >
              <dt className="text-[11px] text-gray-400">{stat.label}</dt>
              <dd className="text-[12px] font-semibold text-white">{stat.value}</dd>
            </div>
          ))}
        </dl>

        {student.quote && (
          <blockquote className="mt-auto border-l-2 border-[#FCDD00]/40 pl-4 text-sm leading-relaxed text-gray-300">
            {"«\u00a0"}
            {student.quote}
            {"\u00a0»"}
          </blockquote>
        )}
      </div>
    </motion.article>
  );
}

export function StudentTransformationsSection({
  id = "transformations",
  showGallery = true,
  showCta = true,
  className = "",
}: StudentTransformationsSectionProps) {
  return (
    <section
      id={id}
      className={`relative overflow-hidden bg-black py-20 ${className}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(252,221,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(252,221,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <span className="mb-3 block font-mono text-[10px] uppercase tracking-[0.3em] text-[#FCDD00] sm:text-xs">
            Élèves en coaching suivi
          </span>
          <h2
            id={`${id}-title`}
            className="mb-2 font-sans text-3xl font-black uppercase tracking-tighter text-white sm:text-4xl md:text-5xl lg:text-6xl"
          >
            Transformations
          </h2>
          <p
            aria-hidden="true"
            className="mb-6 font-sans text-3xl font-black uppercase tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl"
            style={{ WebkitTextStroke: "1px rgba(255,255,255,0.2)", color: "transparent" }}
          >
            Réelles
          </p>
          <p className="mx-auto max-w-2xl text-gray-400">
            Ce sont des élèves que je suis chaque semaine&nbsp;: leurs pesées, leurs mesures, leurs photos et leurs mots, tels
            qu'ils me les ont envoyés. Chacun m'a donné son accord pour que je partage son parcours ici.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {STUDENT_TRANSFORMATIONS.map((student, index) => (
            <TransformationCard key={student.id} student={student} index={index} />
          ))}
        </div>

        {showGallery && INSTAGRAM_TRANSFORMATIONS.length > 0 && (
          <div className="mt-20">
            <div className="mb-8 text-center">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-gray-500 sm:text-xs">
                Publiées sur mon Instagram
              </p>
              <h3 className="font-sans text-2xl font-black uppercase tracking-tighter text-white sm:text-3xl">
                D'autres transformations d'élèves
              </h3>
            </div>
            <ul className="flex flex-wrap justify-center gap-3" aria-label="Transformations d'élèves publiées sur Instagram">
              {INSTAGRAM_TRANSFORMATIONS.map((visual) => (
                <li
                  key={visual.src}
                  className="w-[calc(50%-0.375rem)] overflow-hidden rounded-md border border-white/10 bg-neutral-950 transition-all hover:border-[#FCDD00]/30 sm:w-[calc(33.333%-0.5rem)] lg:w-[calc(25%-0.5625rem)]"
                >
                  <img
                    src={visual.src}
                    alt={visual.alt}
                    loading="lazy"
                    decoding="async"
                    width={720}
                    height={720}
                    className="aspect-square h-full w-full object-cover"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-gray-500" data-testid="student-transformations-disclaimer">
          Résultats individuels, ils dépendent de ton point de départ et de ton assiduité.
        </p>

        {showCta && (
          <div className="mt-8 text-center">
            <a
              href="/offre-coaching"
              className="inline-block rounded-sm bg-[#FCDD00] px-8 py-4 text-sm font-black uppercase tracking-widest text-black shadow-[0_0_20px_rgba(252,221,0,0.3)] transition-all hover:bg-[#FCDD00]/90 hover:shadow-[0_0_30px_rgba(252,221,0,0.5)]"
              data-testid="student-transformations-cta"
            >
              Voir mes formules de coaching →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

export default StudentTransformationsSection;
