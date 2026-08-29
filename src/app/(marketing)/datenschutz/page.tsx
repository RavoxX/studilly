import type { Metadata } from "next";
import { LegalPage, Placeholder } from "@/components/legal/legal-page";
import { getLocale, getT } from "@/i18n/server";

export const metadata: Metadata = { title: "Datenschutz" };

const UPDATED = "28.08.2026";

export default async function PrivacyPage() {
  const t = await getT();
  const locale = await getLocale();

  return (
    <LegalPage title={t.legal.privacyTitle} updated={UPDATED}>
      {locale === "de" ? <GermanPrivacy /> : <EnglishPrivacy />}
    </LegalPage>
  );
}

function GermanPrivacy() {
  return (
    <>
      <section>
        <h2>1. Verantwortliche Stelle</h2>
        <p>
          Verantwortlich für die Datenverarbeitung auf dieser Plattform im Sinne
          der DSGVO ist:
        </p>
        <p>
          <Placeholder>Firmierung des Betreibers</Placeholder>
          <br />
          <Placeholder>Straße und Hausnummer</Placeholder>
          <br />
          <Placeholder>PLZ und Ort</Placeholder>
          <br />
          E-Mail: <Placeholder>Kontakt-E-Mail</Placeholder>
        </p>
        <p>
          Datenschutzbeauftragte Person:{" "}
          <Placeholder>
            Name und Kontakt, falls nach Art. 37 DSGVO erforderlich
          </Placeholder>
        </p>
      </section>

      <section>
        <h2>2. Welche Daten wir verarbeiten</h2>
        <p>
          Studilly verarbeitet ausschließlich Daten, die für den Betrieb der
          Lernplattform erforderlich sind.
        </p>

        <h3>Kontodaten</h3>
        <ul>
          <li>E-Mail-Adresse (für Anmeldung und Passwort-Zurücksetzung)</li>
          <li>Anzeigename, den du selbst wählst</li>
          <li>Passwort, ausschließlich als kryptografischer Hash gespeichert</li>
        </ul>

        <h3>Schulische Angaben</h3>
        <ul>
          <li>Bundesland, Schulform, Klassenstufe, Schulstufe</li>
          <li>Gewählte Fächer und optional Prüfungstermine</li>
        </ul>
        <p>
          Diese Angaben sind der Zweck des Dienstes: ohne sie lassen sich keine
          Aufgaben erzeugen, die zu deinem Unterricht passen.
        </p>

        <h3>Lerninhalte</h3>
        <ul>
          <li>Von dir hochgeladene Dateien und der daraus extrahierte Text</li>
          <li>Erzeugte Klausuren, deine Antworten und die Korrekturen</li>
          <li>Lernstandsdaten: erkannte Schwerpunkte, Karteikarten, Lernpläne</li>
        </ul>

        <h3>Nutzungsdaten</h3>
        <ul>
          <li>Zähler über verbrauchte Kontingente pro Kalendermonat</li>
          <li>Technische Server-Logs zur Fehlersuche und Missbrauchsabwehr</li>
        </ul>
        <p>
          Wir setzen kein Tracking, keine Werbe-Cookies und keine
          Reichweitenmessung durch Dritte ein. Die einzigen gesetzten Cookies
          sind die Sitzungs-Cookies der Anmeldung sowie zwei
          Präferenz-Cookies für Sprache und Darstellung. Diese sind für den
          Betrieb erforderlich und benötigen daher keine Einwilligung.
        </p>
      </section>

      <section>
        <h2>3. Rechtsgrundlagen</h2>
        <table>
          <thead>
            <tr>
              <th>Verarbeitung</th>
              <th>Rechtsgrundlage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Konto, schulische Angaben, Lerninhalte</td>
              <td>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</td>
            </tr>
            <tr>
              <td>Server-Logs, Missbrauchsabwehr</td>
              <td>Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)</td>
            </tr>
            <tr>
              <td>Optionale Qualitätsprüfung erzeugter Aufgaben</td>
              <td>Art. 6 Abs. 1 lit. a DSGVO (Einwilligung, standardmäßig aus)</td>
            </tr>
            <tr>
              <td>Abo-Verwaltung</td>
              <td>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>4. Empfänger und Auftragsverarbeiter</h2>
        <p>
          Wir geben Daten nur an Dienstleister weiter, die für den Betrieb
          erforderlich sind. Mit diesen sind Verträge zur Auftragsverarbeitung
          nach Art. 28 DSGVO zu schließen; der Abschluss liegt beim Betreiber.
        </p>
        <table>
          <thead>
            <tr>
              <th>Dienst</th>
              <th>Zweck</th>
              <th>Ort der Verarbeitung</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Supabase</td>
              <td>Datenbank, Authentifizierung, Dateispeicher</td>
              <td>Region eu-central-1 (Frankfurt am Main)</td>
            </tr>
            <tr>
              <td>OpenAI</td>
              <td>
                Erzeugung und Korrektur von Aufgaben. Übermittelt werden
                Auszüge deiner Materialien und deine Antworten.
              </td>
              <td>
                USA. Übermittlung auf Grundlage von{" "}
                <Placeholder>
                  Standardvertragsklauseln oder Angemessenheitsbeschluss, vom
                  Betreiber zu prüfen
                </Placeholder>
              </td>
            </tr>
            <tr>
              <td>RevenueCat</td>
              <td>Verwaltung von Abonnements</td>
              <td>
                USA.{" "}
                <Placeholder>
                  Derzeit ausschließlich Testmodus, keine Zahlungsdaten
                </Placeholder>
              </td>
            </tr>
            <tr>
              <td>
                <Placeholder>Hosting-Anbieter der Anwendung</Placeholder>
              </td>
              <td>Auslieferung der Anwendung</td>
              <td>
                <Placeholder>Region</Placeholder>
              </td>
            </tr>
          </tbody>
        </table>
        <p>
          Wir verkaufen keine Daten. Wir nutzen keine Lerndaten für Werbung.
        </p>
      </section>

      <section>
        <h2>5. Speicherdauer</h2>
        <ul>
          <li>
            Kontodaten und Lerninhalte: bis zur Löschung des Kontos durch dich.
          </li>
          <li>
            Nach Kontolöschung werden alle personenbezogenen Daten und
            hochgeladenen Dateien unverzüglich entfernt.
          </li>
          <li>
            Server-Logs:{" "}
            <Placeholder>
              Aufbewahrungsdauer festlegen, üblich sind 7 bis 30 Tage
            </Placeholder>
          </li>
          <li>
            Abrechnungsrelevante Daten:{" "}
            <Placeholder>
              gesetzliche Aufbewahrungsfristen nach HGB und AO beachten
            </Placeholder>
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Deine Rechte</h2>
        <p>
          Dir stehen die Rechte auf Auskunft (Art. 15), Berichtigung (Art. 16),
          Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
          Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21) zu. Eine
          erteilte Einwilligung kannst du jederzeit mit Wirkung für die Zukunft
          widerrufen.
        </p>
        <p>
          Zwei dieser Rechte kannst du direkt in der Anwendung ausüben: unter
          Einstellungen findest du einen vollständigen Datenexport im
          JSON-Format sowie die endgültige Löschung deines Kontos.
        </p>
        <p>
          Außerdem steht dir ein Beschwerderecht bei einer Aufsichtsbehörde zu.
          Zuständig ist die Behörde deines Wohnorts oder die des Betreibers:{" "}
          <Placeholder>zuständige Aufsichtsbehörde</Placeholder>
        </p>
      </section>

      <section>
        <h2>7. Minderjährige</h2>
        <p>
          Studilly richtet sich an Schülerinnen und Schüler und wird daher auch
          von Minderjährigen genutzt. Der Betreiber muss festlegen und
          dokumentieren, ab welchem Alter eine eigenständige Nutzung möglich ist
          und wie eine Einwilligung der Sorgeberechtigten nach Art. 8 DSGVO
          eingeholt wird. In Deutschland ist hierfür regelmäßig die Vollendung
          des 16. Lebensjahres maßgeblich.
        </p>
        <p>
          <Placeholder>
            Altersgrenze und Verfahren zur Einholung der elterlichen
            Einwilligung festlegen
          </Placeholder>
        </p>
      </section>

      <section>
        <h2>8. Automatisierte Bewertung</h2>
        <p>
          Studilly bewertet deine Antworten mithilfe von KI-Modellen. Diese
          Bewertung dient ausschließlich dem Üben. Sie ist keine Schulnote, hat
          keine rechtliche Wirkung und wird nicht an deine Schule übermittelt.
          Die Punktevergabe erfolgt kriterienweise, die Umrechnung in eine Note
          rechnet die Anwendung selbst nach einem Schlüssel, den du in den
          Einstellungen ändern kannst.
        </p>
      </section>

      <section>
        <h2>9. Hinweis zum Stand dieses Dokuments</h2>
        <p>
          Dieser Text beschreibt die tatsächlich implementierten technischen
          Maßnahmen. Er ersetzt keine rechtliche Prüfung. Die Aussage, dass eine
          Anwendung DSGVO-konform ist, hängt von organisatorischen Entscheidungen
          des Betreibers ab, die außerhalb der Software liegen, etwa vom
          Abschluss der Auftragsverarbeitungsverträge, der Festlegung von
          Löschfristen und dem Verzeichnis von Verarbeitungstätigkeiten.
        </p>
      </section>
    </>
  );
}

function EnglishPrivacy() {
  return (
    <>
      <section>
        <h2>1. Controller</h2>
        <p>
          The controller for data processing on this platform under the GDPR is:
        </p>
        <p>
          <Placeholder>Operator legal entity</Placeholder>
          <br />
          <Placeholder>Street and number</Placeholder>
          <br />
          <Placeholder>Postcode and city</Placeholder>
          <br />
          Email: <Placeholder>Contact email</Placeholder>
        </p>
      </section>

      <section>
        <h2>2. What we process</h2>
        <p>
          Studilly processes only what the learning platform needs to work.
        </p>
        <h3>Account data</h3>
        <ul>
          <li>Email address, for sign-in and password reset</li>
          <li>A display name you choose</li>
          <li>Password, stored only as a cryptographic hash</li>
        </ul>
        <h3>School context</h3>
        <ul>
          <li>Federal state, school type, grade, stage</li>
          <li>Chosen subjects and, optionally, exam dates</li>
        </ul>
        <h3>Learning content</h3>
        <ul>
          <li>Files you upload and the text extracted from them</li>
          <li>Generated exams, your answers and the resulting marking</li>
          <li>Progress data: detected focus areas, flashcards, study plans</li>
        </ul>
        <h3>Usage data</h3>
        <ul>
          <li>Counters for monthly plan allowances</li>
          <li>Technical server logs for debugging and abuse prevention</li>
        </ul>
        <p>
          There is no tracking, no advertising cookies and no third-party
          analytics. The only cookies set are the sign-in session cookies and
          two preference cookies for language and appearance.
        </p>
      </section>

      <section>
        <h2>3. Processors</h2>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Purpose</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Supabase</td>
              <td>Database, authentication, file storage</td>
              <td>eu-central-1 (Frankfurt, Germany)</td>
            </tr>
            <tr>
              <td>OpenAI</td>
              <td>
                Generating and marking tasks. Excerpts of your materials and
                your answers are transmitted.
              </td>
              <td>
                United States.{" "}
                <Placeholder>
                  Transfer mechanism to be confirmed by the operator
                </Placeholder>
              </td>
            </tr>
            <tr>
              <td>RevenueCat</td>
              <td>Subscription management</td>
              <td>
                United States.{" "}
                <Placeholder>Test mode only, no payment data</Placeholder>
              </td>
            </tr>
          </tbody>
        </table>
        <p>We do not sell data and we do not use learning data for advertising.</p>
      </section>

      <section>
        <h2>4. Your rights</h2>
        <p>
          You have the rights of access, rectification, erasure, restriction,
          portability and objection under the GDPR, and you may withdraw consent
          at any time.
        </p>
        <p>
          Two of these are available directly in the app: Settings offers a full
          data export as JSON and permanent deletion of your account.
        </p>
      </section>

      <section>
        <h2>5. Minors</h2>
        <p>
          Studilly is aimed at school students and will therefore be used by
          minors. The operator must define and document the minimum age for
          independent use and how parental consent under Art. 8 GDPR is
          obtained.
        </p>
        <p>
          <Placeholder>Age threshold and parental consent process</Placeholder>
        </p>
      </section>

      <section>
        <h2>6. Automated marking</h2>
        <p>
          Studilly marks your answers using AI models. This is for practice
          only. It is not a school grade, has no legal effect and is not sent to
          your school.
        </p>
      </section>

      <section>
        <h2>7. Status of this document</h2>
        <p>
          This text describes the technical measures that are actually
          implemented. It does not replace legal review. Whether the service is
          GDPR compliant depends on organisational decisions outside the
          software.
        </p>
      </section>
    </>
  );
}
