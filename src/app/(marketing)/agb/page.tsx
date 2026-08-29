import type { Metadata } from "next";
import { LegalPage, Placeholder } from "@/components/legal/legal-page";
import { getLocale, getT } from "@/i18n/server";

export const metadata: Metadata = { title: "AGB" };

const UPDATED = "28.08.2026";

export default async function TermsPage() {
  const t = await getT();
  const locale = await getLocale();

  return (
    <LegalPage title={t.legal.termsTitle} updated={UPDATED}>
      {locale === "de" ? <GermanTerms /> : <EnglishTerms />}
    </LegalPage>
  );
}

function GermanTerms() {
  return (
    <>
      <section>
        <h2>1. Geltungsbereich und Anbieter</h2>
        <p>
          Diese Bedingungen gelten für die Nutzung der Lernplattform Studilly,
          angeboten von <Placeholder>Firmierung des Betreibers</Placeholder>,{" "}
          <Placeholder>Anschrift</Placeholder>.
        </p>
      </section>

      <section>
        <h2>2. Leistungsbeschreibung</h2>
        <p>
          Studilly erzeugt aus von dir hochgeladenen Materialien Übungsaufgaben
          und Übungsklausuren, bewertet deine Antworten und leitet daraus
          Übungsempfehlungen ab. Die Plattform ist ein Hilfsmittel zum
          Selbstlernen.
        </p>
        <p>
          Studilly ist keine Schule, keine Nachhilfeeinrichtung und keine
          Prüfungsbehörde. Erzeugte Aufgaben sind keine amtlichen
          Prüfungsaufgaben. Bewertungen sind Einschätzungen zum Üben und haben
          keine schulrechtliche Wirkung.
        </p>
      </section>

      <section>
        <h2>3. Nutzungsvoraussetzungen</h2>
        <ul>
          <li>Ein Konto ist erforderlich. Angaben müssen zutreffend sein.</li>
          <li>Zugangsdaten sind geheim zu halten und nicht weiterzugeben.</li>
          <li>
            Mindestalter für eine eigenständige Nutzung:{" "}
            <Placeholder>Altersgrenze festlegen</Placeholder>. Darunter ist die
            Zustimmung der Sorgeberechtigten erforderlich.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Inhalte, die du hochlädst</h2>
        <p>
          Die Rechte an deinen hochgeladenen Materialien bleiben bei dir
          beziehungsweise bei den jeweiligen Rechteinhabern. Du räumst dem
          Betreiber nur das einfache Recht ein, diese Inhalte technisch zu
          verarbeiten, soweit das zur Erbringung der Leistung notwendig ist.
        </p>
        <p>
          Du sicherst zu, nur Inhalte hochzuladen, zu deren Nutzung du berechtigt
          bist. Das Hochladen fremder urheberrechtlich geschützter Werke ohne
          Erlaubnis ist unzulässig. Verboten ist außerdem das Hochladen von
          rechtswidrigen Inhalten, Schadsoftware und personenbezogenen Daten
          Dritter.
        </p>
      </section>

      <section>
        <h2>5. Unzulässige Nutzung</h2>
        <ul>
          <li>
            Umgehung technischer Beschränkungen, insbesondere der Kontingente
            und der Zugriffskontrolle
          </li>
          <li>Automatisierter Massenabruf außerhalb der vorgesehenen Nutzung</li>
          <li>
            Versuche, andere Konten, fremde Materialien oder interne Systeme
            einzusehen
          </li>
          <li>
            Nutzung, die darauf abzielt, in einer echten Prüfung zu täuschen
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Tarife, Kontingente und Zahlung</h2>
        <p>
          Studilly wird in den Tarifen Free, Pro und Ultra angeboten. Umfang und
          monatliche Kontingente sind auf der Preisseite ausgewiesen und werden
          serverseitig durchgesetzt.
        </p>
        <p>
          Wichtig: In der derzeitigen Fassung erfolgt keine echte
          Zahlungsabwicklung. Käufe laufen ausschließlich im Testmodus des
          Abo-Anbieters. Es werden keine Zahlungsdaten erhoben und keine Beträge
          abgebucht.
        </p>
        <p>
          <Placeholder>
            Vor einem Produktivbetrieb ergänzen: Abrechnungszeitraum,
            Kündigungsfristen, automatische Verlängerung, Preisänderungen sowie
            die gesetzliche Widerrufsbelehrung für Verbraucher nach Paragraf 355
            BGB einschließlich Muster-Widerrufsformular
          </Placeholder>
        </p>
      </section>

      <section>
        <h2>7. Verfügbarkeit</h2>
        <p>
          Ein bestimmtes Verfügbarkeitsniveau wird nicht zugesichert.
          Wartungsarbeiten und Störungen bei eingesetzten Dienstleistern können
          zu Unterbrechungen führen.
        </p>
      </section>

      <section>
        <h2>8. Haftung</h2>
        <p>
          Der Betreiber haftet unbeschränkt bei Vorsatz und grober
          Fahrlässigkeit sowie bei Verletzung von Leben, Körper und Gesundheit.
          Bei einfacher Fahrlässigkeit besteht eine Haftung nur bei Verletzung
          wesentlicher Vertragspflichten und begrenzt auf den vertragstypischen,
          vorhersehbaren Schaden.
        </p>
        <p>
          Keine Haftung wird für den Lernerfolg oder für in einer Prüfung
          erzielte Noten übernommen. Erzeugte Aufgaben und Bewertungen können
          Fehler enthalten und sind vor einer Verwendung fachlich zu prüfen.
        </p>
      </section>

      <section>
        <h2>9. Laufzeit und Kündigung</h2>
        <p>
          Das Nutzungsverhältnis läuft auf unbestimmte Zeit. Du kannst dein Konto
          jederzeit in den Einstellungen löschen. Mit der Löschung endet das
          Nutzungsverhältnis und alle Inhalte werden entfernt.
        </p>
      </section>

      <section>
        <h2>10. Schlussbestimmungen</h2>
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
          UN-Kaufrechts. Gerichtsstand:{" "}
          <Placeholder>Gerichtsstand, sofern zulässig</Placeholder>. Zwingende
          Verbraucherschutzvorschriften bleiben unberührt.
        </p>
        <p>
          Plattform der EU zur Online-Streitbeilegung:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            rel="noopener noreferrer"
            target="_blank"
          >
            ec.europa.eu/consumers/odr
          </a>
          .{" "}
          <Placeholder>
            Angabe ergänzen, ob der Betreiber zur Teilnahme an einem
            Streitbeilegungsverfahren bereit oder verpflichtet ist
          </Placeholder>
        </p>
      </section>
    </>
  );
}

function EnglishTerms() {
  return (
    <>
      <section>
        <h2>1. Scope and provider</h2>
        <p>
          These terms govern use of the Studilly learning platform, provided by{" "}
          <Placeholder>Operator legal entity</Placeholder>,{" "}
          <Placeholder>Address</Placeholder>.
        </p>
      </section>

      <section>
        <h2>2. What the service does</h2>
        <p>
          Studilly turns material you upload into practice tasks and practice
          exams, marks your answers and derives practice recommendations. It is
          a self-study aid.
        </p>
        <p>
          Studilly is not a school and not an examination authority. Generated
          tasks are not official exam papers, and marking is an estimate for
          practice with no effect under school law.
        </p>
      </section>

      <section>
        <h2>3. Requirements for use</h2>
        <ul>
          <li>An account is required and details must be accurate.</li>
          <li>Credentials must be kept confidential and not shared.</li>
          <li>
            Minimum age for independent use:{" "}
            <Placeholder>define age threshold</Placeholder>. Below that,
            parental consent is required.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Content you upload</h2>
        <p>
          You keep the rights to your uploaded material. You grant the operator
          only the non-exclusive right to process it technically, as far as
          necessary to deliver the service.
        </p>
        <p>
          You confirm that you are entitled to use what you upload. Uploading
          third-party copyrighted works without permission is not allowed, nor
          is uploading unlawful content, malware or other people&rsquo;s personal
          data.
        </p>
      </section>

      <section>
        <h2>5. Prohibited use</h2>
        <ul>
          <li>Circumventing technical limits, in particular plan allowances</li>
          <li>Automated bulk access outside intended use</li>
          <li>Attempting to access other accounts or internal systems</li>
          <li>Use aimed at cheating in a real examination</li>
        </ul>
      </section>

      <section>
        <h2>6. Plans, allowances and payment</h2>
        <p>
          Studilly is offered as Free, Pro and Ultra. Scope and monthly
          allowances are listed on the pricing page and enforced server-side.
        </p>
        <p>
          Important: in the current version there is no real payment processing.
          Purchases run exclusively in the subscription provider&rsquo;s test mode. No
          payment details are collected and no money is charged.
        </p>
        <p>
          <Placeholder>
            Before production, add billing period, cancellation, automatic
            renewal, price changes and the statutory right of withdrawal for
            consumers
          </Placeholder>
        </p>
      </section>

      <section>
        <h2>7. Availability</h2>
        <p>
          No particular level of availability is guaranteed. Maintenance and
          incidents at upstream providers can cause interruptions.
        </p>
      </section>

      <section>
        <h2>8. Liability</h2>
        <p>
          Liability is unlimited for intent and gross negligence and for injury
          to life, body or health. For ordinary negligence, liability applies
          only to breach of material contractual duties and is limited to
          foreseeable damage typical of this type of contract.
        </p>
        <p>
          No liability is accepted for learning outcomes or for grades achieved
          in a real examination. Generated tasks and marking can contain errors
          and should be checked before being relied on.
        </p>
      </section>

      <section>
        <h2>9. Term and termination</h2>
        <p>
          The agreement runs indefinitely. You can delete your account at any
          time in Settings, which ends the agreement and removes your content.
        </p>
      </section>

      <section>
        <h2>10. Final provisions</h2>
        <p>
          German law applies, excluding the UN Convention on Contracts for the
          International Sale of Goods. Mandatory consumer protection rules are
          unaffected.
        </p>
      </section>
    </>
  );
}
