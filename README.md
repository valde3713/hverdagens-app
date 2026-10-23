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
4. Under **Authentication → Providers → Email**, slå e-mailbekræftelse fra. Login bruger kaldenavn og en syntetisk loginadresse. Ved oprettelse indtaster brugeren også en privat kontakt-e-mail; den bruges ikke til login og er ikke bekræftet.

Adgangskoder skal være mindst 8 tegn. Brugere kan logge ind fra flere enheder med samme kaldenavn og kode. Når man er logget ind, kan adgangskoden ændres under **Min profil → Indstillinger**. Kaldenavn kan ændres efter mindst 36 delte gerninger. Appens tema og sprogvalg gemmes lokalt i browseren. Brugere kan hente en JSON-kopi af deres appdata og slette konto og tilhørende data fra **Indstillinger → Dine data**. Brugere kan også slette enkelte gerninger.

Ved oprettelse skal brugeren acceptere vilkårene og bekræfte at have læst privatlivsinformationen. Brugeren vælger, om andre indloggede brugere ser kaldenavn eller eget navn. E-mailen forbliver privat. Offentlige profiler kan søges frem fra pointtavlen og vise profiltekst og delte gerninger. Eksisterende brugere skal aktivt slå offentlig profil til i indstillinger, før de vises i søgning og på pointtavlen. De kan også slå offentlig visning fra igen. Pointtavlen bygger på brugernes egne indberetninger og er ikke en verificeret konkurrence.

## Privat adminoversigt

`/codespace-time/` logger ind med en eksisterende konto og en ekstra admin-kode på 4–64 bogstaver og/eller tal; der er ingen oprettelsesmulighed. Databasefunktionen `get_admin_dashboard()` returnerer kun data, hvis den verificerede bruger står i den private tabel `admin_users` og indtaster korrekt kode. Databasen gemmer kun en bcrypt-hash, begrænser forkerte forsøg og viser ikke private e-mailadresser.

For at aktivere adminoversigten skal du køre hele `supabase.sql` i **Supabase Dashboard → SQL Editor**. Derefter vælger du selv en admin-kode og kører den særskilte SQL-kommando i README'en efter at have erstattet eksempelteksten. Koden gemmes som bcrypt-hash; del den ikke. Brug kun din egen konto som admin. Der er ingen offentlig kontooprettelse, og private e-mailadresser udleveres ikke af dashboardet.

Kør dette i SQL Editor efter migrationen, og erstat teksten `SKRIV-DIN-EGEN-KODE-HER` med din egen kode på 4–64 bogstaver og/eller tal:

```sql
update public.admin_users
set access_code_hash = extensions.crypt(
  'SKRIV-DIN-EGEN-KODE-HER',
  extensions.gen_salt('bf')
)
where user_id in (
  select id
  from auth.users
  where lower(email) = 'admin@users.hverdagens.invalid'
);
```

Koden gemmes som bcrypt-hash. Vælg helst en længere blanding af bogstaver og tal, og del ikke den rigtige kode. Efter fem forkerte forsøg låses admin-koden i 15 minutter.

Hvis migrationen allerede er kørt, kør den opdaterede adminsektion fra SQL-filen, og sæt derefter admin-koden med SQL-kommandoen.

Databasepolitikkerne begrænser læsning og ændring til de nødvendige roller; brugere kan kun slette egne gerninger. Kaldenavne valideres også i databasen. `get_login_email` beregner appens syntetiske loginadresse ud fra kaldenavnet i stedet for at slå konti op. Supabase `anon`/publishable-nøglen er offentlig og må gerne ligge i frontend; `service_role`-nøglen og databaseadgangskoden må aldrig udgives.

Kør hele `supabase.sql` i SQL Editor, før den opdaterede app bruges. Migrationen opretter de offentlige profil- og private kontaktdatafunktioner, vilkårsregistrering samt selvbetjent kontoeksport/-sletning. Eksisterende profiler bliver ikke automatisk offentlige; hver bruger skal selv slå offentlig profil til. Migrationen fjerner de gamle, inaktive e-mail-2FA-tabeller.

Læs også [vilkårene](./terms.html) og [privatlivsinformationen](./privacy.html). Supabase-projektet er oplyst at ligge i en EU-region; kontrollér den præcise region i Dashboard. Supabase JavaScript-biblioteket ligger lokalt sammen med appen, så brugerens browser ikke skal hente appkode fra en ekstra CDN. Placering i EU er ikke i sig selv en garanti for overholdelse af GDPR. Indsæt den dataansvarliges kontaktadresse på privatlivssiden, og få de juridiske oplysninger gennemgået, før appen åbnes bredt.

## Android- og iOS-app

Mobilappen bruger Capacitor til at pakke den samme app til Android og iOS. `config.js` indeholder den offentlige Supabase-nøgle og pakkes med appen; læg aldrig `service_role`-nøglen i klienten.

1. Installér Node.js 22 eller nyere, Java 21, Android Studio/Android SDK og Xcode på en Mac til iOS.
2. Installér JavaScript-afhængigheder, kopiér webappen til mobilprojektet, og synkronisér:

   ```sh
   npm install
   npm run mobile:sync
   ```

   Hvis Android- eller iOS-projektmappen mangler, opret den én gang med `npx cap add android` eller `npx cap add ios`.
3. Efter webændringer:

   ```sh
   npm run mobile:sync
   ```

4. Android: Åbn `android/` i Android Studio, eller byg en debug-APK med `cd android && ./gradlew assembleDebug`. APK'en ligger i `android/app/build/outputs/apk/debug/`.
5. iOS: På en Mac, kør `npx cap open ios`, vælg et signing team i Xcode, og byg/arkivér appen der. En IPA til installation/distribution kræver Apples signering og en Apple-udviklerkonto. IPA kan ikke bygges eller signeres på Linux.

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
