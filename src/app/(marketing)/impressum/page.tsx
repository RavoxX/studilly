import type { Metadata } from "next";
import { LegalPage, Placeholder } from "@/components/legal/legal-page";
import { getLocale, getT } from "@/i18n/server";

export const metadata: Metadata = { title: "Impressum" };

const UPDATED = "28.08.2026";

/**
 * Imprint.
 *
 * German law (Paragraf 5 DDG, formerly TMG) requires specific operator details
 * on a commercial website. Every one of them is information only the operator
 * has, so this page is entirely placeholders with the legal basis named for
 * each field. Inventing a company name and address here would be worse than
 * useless: it would be a false statement on a legally mandated page.
 */
export default async function ImprintPage() {
  const t = await getT();
  const locale = await getLocale();

  return (
    <LegalPage title={t.legal.imprintTitle} updated={UPDATED}>
      {locale === "de" ? <GermanImprint /> : <EnglishImprint />}
    </LegalPage>
  );
}

function GermanImprint() {
  return (
    <>
      <section>
        <h2>Angaben gemäß Paragraf 5 DDG</h2>
        <p>
          <Placeholder>Firmierung, einschließlich Rechtsform</Placeholder>
          <br />
          <Placeholder>Straße und Hausnummer</Placeholder>
          <br />
          <Placeholder>PLZ und Ort</Placeholder>
          <br />
          <Placeholder>Land</Placeholder>
        </p>
      </section>

      <section>
        <h2>Vertreten durch</h2>
        <p>
          <Placeholder>
            Name der vertretungsberechtigten Person, bei einer GmbH die
            Geschäftsführung
          </Placeholder>
        </p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          Telefon: <Placeholder>Telefonnummer</Placeholder>
          <br />
          E-Mail: <Placeholder>Kontakt-E-Mail</Placeholder>
        </p>
        <p>
          Eine E-Mail-Adresse ist zwingend erforderlich. Ein weiterer Kanal für
          unmittelbare Kommunikation ist ebenfalls anzugeben.
        </p>
      </section>

      <section>
        <h2>Registereintrag</h2>
        <p>
          Registergericht: <Placeholder>Amtsgericht</Placeholder>
          <br />
          Registernummer: <Placeholder>HRB-Nummer</Placeholder>
        </p>
        <p>Entfällt bei Einzelunternehmen ohne Registereintragung.</p>
      </section>

      <section>
        <h2>Umsatzsteuer-Identifikationsnummer</h2>
        <p>
          Gemäß Paragraf 27 a Umsatzsteuergesetz:{" "}
          <Placeholder>USt-IdNr., sofern vorhanden</Placeholder>
        </p>
      </section>

      <section>
        <h2>Verantwortlich für den Inhalt</h2>
        <p>
          <Placeholder>Name</Placeholder>
          <br />
          <Placeholder>Anschrift</Placeholder>
        </p>
      </section>

      <section>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          <Placeholder>
            Angabe ergänzen, ob eine Bereitschaft oder Verpflichtung zur
            Teilnahme an einem Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle besteht
          </Placeholder>
        </p>
      </section>

      <section>
        <h2>Hinweis</h2>
        <p>
          Diese Seite ist unvollständig. Alle oben markierten Angaben muss der
          Betreiber eintragen. Ein unvollständiges oder unrichtiges Impressum
          kann abgemahnt werden.
        </p>
      </section>
    </>
  );
}

function EnglishImprint() {
  return (
    <>
      <section>
        <h2>Provider identification</h2>
        <p>
          German law requires specific provider details on a commercial website.
          The German version of this page is the legally relevant one.
        </p>
        <p>
          <Placeholder>Legal entity, including legal form</Placeholder>
          <br />
          <Placeholder>Street and number</Placeholder>
          <br />
          <Placeholder>Postcode and city</Placeholder>
          <br />
          <Placeholder>Country</Placeholder>
        </p>
      </section>

      <section>
        <h2>Represented by</h2>
        <p>
          <Placeholder>Name of the authorised representative</Placeholder>
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Phone: <Placeholder>Phone number</Placeholder>
          <br />
          Email: <Placeholder>Contact email</Placeholder>
        </p>
      </section>

      <section>
        <h2>Register entry</h2>
        <p>
          Register court: <Placeholder>Court</Placeholder>
          <br />
          Register number: <Placeholder>Registration number</Placeholder>
        </p>
      </section>

      <section>
        <h2>VAT identification number</h2>
        <p>
          <Placeholder>VAT ID, if applicable</Placeholder>
        </p>
      </section>

      <section>
        <h2>Note</h2>
        <p>
          This page is incomplete. Every marked field must be filled in by the
          operator before the service goes live.
        </p>
      </section>
    </>
  );
}
