# Hverdagens app

En statisk, dansk app til GitHub Pages. Brugere logger ind med kaldenavn og personlig kode, deler en god gerning for naturen og får ét point pr. delt gerning. Profiler og pointtavle deles via Supabase.

## Sæt Supabase op

1. Opret et Supabase-projekt.
2. Åbn projektets **SQL Editor**, indsæt indholdet fra `supabase.sql`, og kør det.
3. Find projektets URL og **anon/public key** under **Project Settings → API**, og sæt dem ind i `config.js`:

   ```js
   window.APP_CONFIG = {
     supabaseUrl: "https://DIT-PROJEKT.supabase.co",
     supabaseAnonKey: "DIN_SUPABASE_ANON_KEY"
   };
   ```

   Den offentlige anon key er beregnet til klientapps. Læg aldrig projektets `service_role`-nøgle i denne app.
4. Under **Authentication → Providers → Email**, slå e-mailbekræftelse fra. Appens adgangskodelogin bruger stadig et syntetisk login-id; tofaktor-e-mailen indstilles separat under profilen.

Adgangskoder skal være mindst 8 tegn. Brugere kan logge ind fra flere enheder med samme kaldenavn og kode. Når man er logget ind, kan adgangskoden ændres under **Min profil → Indstillinger**. Kaldenavn kan ændres efter mindst 36 delte gerninger. Appens tema og sprogvalg gemmes lokalt i browseren. Brugere kan hente en JSON-kopi af deres appdata og slette konto og tilhørende data fra **Indstillinger → Dine data**. Brugere kan også slette enkelte gerninger.

Pointtavlen viser kaldenavne og antal delte gerninger; selve beskrivelserne er kun synlige for den bruger, der skrev dem. Point gives automatisk for hver indsendelse, så tavlen bygger på tillid og er ikke en verificeret konkurrence.

Databasepolitikkerne begrænser læsning og ændring til de nødvendige roller; brugere kan kun slette egne gerninger. Kaldenavne valideres også i databasen. `get_login_email` beregner appens syntetiske loginadresse ud fra kaldenavnet i stedet for at slå konti op. Supabase `anon`/publishable-nøglen er offentlig og må gerne ligge i frontend; `service_role`-nøglen og databaseadgangskoden må aldrig udgives.

Læs også [privatlivsinformationen](./privacy.html). Supabase-projektet er oplyst at ligge i en EU-region; kontrollér den præcise region i Dashboard. MFA Edge Function er låst til Frankfurt (`eu-central-1`). Supabase JavaScript-biblioteket ligger lokalt på GitHub Pages, så brugerens browser ikke skal hente appkode fra en ekstra CDN. Før e-mail-tofaktor bruges, skal e-mailudbyderens databehandleraftale, region og overførsler kontrolleres. Placering i EU eller en standardaftale alene er ikke en juridisk garanti. Indsæt en privat kontaktadresse på privatlivssiden, og få de juridiske oplysninger gennemgået, før appen åbnes for flere brugere.

## E-mail-tofaktor (valgfrit)

Tofaktor kræver en rigtig, bekræftet e-mailadresse. Koderne sendes fra en Supabase Edge Function via Resend; de gemmes kun som HMAC-hash med en serverhemmelighed. SQL-politikkerne afviser appens databaseadgang for en konto med tofaktor slået til, indtil den aktuelle Supabase-login-session har bestået e-mailkoden.

1. Kør først hele `supabase.sql` i SQL Editor. Det opretter tofaktor-tabellerne og beskytter databasepolitikkerne.
2. Opret en Resend-konto. Verificér et afsenderdomæne, og opret en API-nøgle. Resend skal have lov til at sende til brugerens adresser; testafsenderen kan være begrænset til din egen adresse. Kontrollér Resends databehandleraftale og vælg EU/EEA-dataplacering i kontoen, hvis valget tilbydes. Uden verificeret afsenderdomæne kan du muligvis kun teste til godkendte adresser; slå ikke funktionen til for andre brugere, før afsendelsen er verificeret.
3. Installér Supabase CLI, log ind, og forbind projektet:

   ```sh
   npx supabase login
   npx supabase link --project-ref crgcciwqyjemxeuehtfl
   ```

4. Lav en hemmelig kode-nøgle lokalt med `openssl rand -hex 32`. Gem den sikkert; del den ikke, og læg den ikke i GitHub.
5. Gå i Supabase Dashboard til **Project Settings → Edge Functions → Secrets**, og opret disse secrets:
   - `RESEND_API_KEY`: din Resend API-nøgle.
   - `MFA_FROM_EMAIL`: en afsender fra dit verificerede domæne, fx `Hverdagens app <kode@ditdomæne.dk>`.
   - `MFA_APP_ORIGIN`: `https://valde3713.github.io` (kun origin, uden `/hverdagens-app`).
   - `MFA_CODE_SECRET`: den tilfældige værdi fra trin 4.

   Supabase leverer selv `SUPABASE_URL`, `SUPABASE_ANON_KEY` og `SUPABASE_SERVICE_ROLE_KEY` til Edge Functions. Kopiér aldrig service-role-nøglen ind i frontend.
6. Fra projektmappen deploy funktionen:

   ```sh
   npx supabase functions deploy email-mfa
   ```

7. Deploy den opdaterede SQL i `supabase.sql`, hvis funktionens tabeller og RLS-politikker ikke allerede er sat op.
8. I appen: **Min profil → Indstillinger → Tofaktorbekræftelse via e-mail**. Indtast din e-mail, hent koden fra indbakken, og bekræft den. Herefter kræves en e-mailkode ved nye login; den godkendte session gælder i 8 timer.

Gem adgang til e-mailkontoen sikkert. Hvis man mister den, kan man ikke gennemføre tofaktorlogin.

## Kør lokalt

Fra projektmappen kan du starte en simpel webserver:

```sh
python3 -m http.server 8000
```

Åbn derefter `http://localhost:8000`. `file://` virker ikke, fordi appen bruger JavaScript-moduler.

## Udgiv på GitHub Pages

1. Push projektmappens filer til roden af et GitHub-repository.
2. Åbn repositoryets **Settings → Pages**.
3. Under **Build and deployment** vælg **Deploy from a branch**, vælg `main` og mappen `/ (root)`, og gem.

Appen kræver ingen build-trin. `config.js` skal være udfyldt, inden appen udgives. Supabase JavaScript-biblioteket i `vendor/` er version 2.118.0 (MIT-licens; se `vendor/LICENSE.supabase-js`). Kør hele `supabase.sql` igen efter databaseændringer; filen er skrevet, så eksisterende tabeller og policies kan opdateres.
