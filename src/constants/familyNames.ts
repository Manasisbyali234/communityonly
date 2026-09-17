// Transcribed from the supplied "Family_Names (1).docx" file. The source
// contains 122 rows, including two duplicate names; options are deduplicated
// so members never see the same choice twice.
const FAMILY_NAME_SOURCE = [
  'Aanera', 'Adkabale', 'Adkar', 'Alike', 'Ambekallu', 'Ame', 'Ammavana', 'Annachira',
  'Baakilana', 'Baarana', 'Baarike', 'Baddana', 'Bekal', 'Bellipaadi', 'Belyana', 'Belyana',
  'Bhoothakallu', 'Bidrupane', 'Bilimale', 'Bittira', 'Bymana', 'Cheeyandi', 'Cheeyappana',
  'Cheriyamane', 'Chettijana', 'Chodipane', 'Dabbadkka', 'Dambekodi', 'Dandina', 'Dayana',
  'Delampaadi', 'Dengodi', 'Deshakodi', 'Deva Jana', 'Devaragunda', 'Devaragunda', 'Doddadkka',
  'Doddahithlu', 'Gabbaladka', 'Goonadka', 'Guthimundana', 'Haadikallu', 'Hemmana', 'Hirebandady',
  'Hiriyadka', 'Hosagadde', 'Huderi', 'Hulimane', 'Jappekodi', 'Kadyada', 'Kajjodi', 'Kalerammana',
  'Kattekodi', 'Kedambaadi', 'Kedambadi', 'Kenjana', 'Ketoli', 'Kevala', 'Kochana', 'Kodapaala',
  'Kodi', 'Kolibailu', 'Kombarana', 'Kompulira', 'Koodakandi', 'Kooingaaje', 'Kotera', 'Kudukuli',
  'Kudupaje', 'Kumblaccheri', 'Kumbugowdana', 'Kunjali', 'Kunjilana', 'Kurunji', 'Kuyyamudi',
  'Madapaadi', 'Madiyana', 'Madthila', 'Maduvegadde', 'Merkaje', 'Montadka', 'Moolemajalu',
  'Mottemane', 'Mukkati', 'Mundodi', 'Naarkodu', 'Nangaru', 'Nidyamale', 'Odiyana', 'Padikallu',
  'Padpu', 'Panathale', 'Paramale', 'Parlakot', 'Perubayi', 'Pilikaje', 'Podanolana', 'Pokkulandra',
  'Ponnachana', 'Poojarira', 'Raamakaje', 'Sabbandra', 'Santhedka', 'Shirakaje', 'Sonangeri',
  'Soodana', 'Soorthale', 'Sulliakodi', 'Thadiyappana', 'Thammachana', 'Thekkada', 'Thenana',
  'Thirodi', 'Thotambailu', 'Thotthena', 'Thumthaje', 'Uluwaru', 'Urubailu', 'Yedakeri', 'Yenadka',
  'Yenkana', 'Yermekaalu',
] as const;

export const FAMILY_NAMES = [...new Set(FAMILY_NAME_SOURCE)].sort((a, b) => a.localeCompare(b));
