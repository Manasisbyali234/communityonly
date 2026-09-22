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

// Additional names supplied by the community. Spelling variants are retained
// intentionally: members should be able to select the name familiar to them.
const FAMILY_NAME_ADDITIONS = [
  'Aame mane', 'Achalapadi', 'Achandira', 'Adka', 'Adpangaya', 'Aiyandra', 'Aiyeti', 'Akkari',
  'Althana', 'Amai', 'Ambrati', 'Ame mane', 'Ammajira', 'Anche Mane', 'Anera', 'Annamana',
  'Aramburu', 'Arayana', 'Arpekatte', 'Ayyandra', 'Ayyetira', 'Badavandra', 'Baduvandra',
  'Baikale mane', 'Bakila Mane', 'Bakilana', 'Baladi', 'Balapada', 'Balekaji', 'Balladka',
  'Ballyamane', 'Bana', 'Bangarakodi', 'Barana', 'Barike', 'Barike - Thavoor (Bhagamandala)',
  'Bariyanda', 'Beechana kaggodlu', 'Beppurana', 'Biliyaara', 'Biliyary', 'Bobbira', 'Bolana',
  'Boliyana', 'Bollumane', 'Bolthaje', 'Bolthajjira', 'Bommiyana', 'Bommudira', 'Bottumane',
  'Bychana', 'Byloli', 'Byneravana', 'Bythadka', 'Chadukaru', 'Chandira', 'Charukana', 'Chathurana',
  'Chattimada', 'Chedukar', 'Cheeyapana', 'Chembu', 'Chettimada', 'Chettineravana', 'Chillana',
  'Chingri', 'Chiyandi', 'Chiyappana', 'Chokkadi', 'Chondira', 'Deraje', 'Derana', 'Devajana',
  'Devangodi', 'Devayira', 'Doddera', 'Dolupaadi', 'Dolupadi', 'Elmekallu', 'Giriyappana',
  'Goddhete', 'Gooddana', 'Goududhare', 'Govindammana', 'Gudanjira', 'Guddana', 'Guddandra',
  'Gudde mane', 'Guddera', 'Gutthimandanda', 'Hoddeti', 'Honnukoti', 'Hooruvalana', 'Hosakulu',
  'Hosalike', 'Hosamane', 'Hosoklu', 'Hosuru', 'Ittanike', 'Jaineera', 'Kadlaemane', 'Kadle',
  'Kadlera', 'Kaibilira', 'Kaibily', 'Kalamane', 'Kalambhi', 'Kaleramanna', 'Kaleyanda', 'Kalladka',
  'Kallapalli', 'Kallembi', 'Kallumutlu', 'Kanadka', 'Kanajal', 'Kandige', 'Kanehithlu',
  'Karakarana', 'Karja', 'Karnayyana', 'Karnyyana', 'Karthojira', 'Kathrikolli', 'Katrathana',
  'Kattemane', 'Kaveramanna', 'Kechapana', 'Kedhambadi', 'Keejana', 'Kekada', 'Kemmara',
  'Kemmarana', 'Kenera', 'Kodagana', 'Kodapalu', 'Kodekallu', 'Kodiacal', 'Kodira', 'Kodiyadka',
  'Koingaje', 'Kokkale', 'Kolambe', 'Kolibylu', 'Kolibylyu', 'Kolimadu', 'Kolimudiyana', 'Kolumbe',
  'Kolumudiyana', 'Kombadi', 'Kombanda', 'Kompuli', 'Koorana', 'Koppada', 'Koppadka', 'Koriyar',
  'Kudakallu', 'Kudpajje', 'Kudukolira', 'Kukkunooru', 'Kulachetti', 'Kullachana', 'Kumbana',
  'Kunchadaka', 'Kunchadka', 'Kunchettira', 'Kundyna', 'Kuntikana', 'Kuttana', 'Kuyamudi',
  'Kymandana', 'Lakandra', 'Lakkandra', 'Lakkappana', 'Majjigemane', 'Mallandira', 'Mandrira',
  'Maniyappana', 'Manjandra', 'Manjapura', 'Marappe', 'Mavojira', 'Mayeati', 'Mekerira', 'Melchembu',
  'Melechombu', 'Mittoor', 'Moodagaddhe', 'Moolemajulu', 'Moote Mane', 'Mootera', 'Moovana',
  'mottana', 'Mudayana mane', 'Muddiyana', 'Mutlu', 'Mylakandra', 'Nadachil', 'Nadavattira',
  'Nadiyana', 'Nadugallu', 'Nadumane', 'Nadumutlu', 'Naduvettira', 'naliyar', 'Nambudira',
  'Natolana', 'Neduvittira', 'Neyani', 'NIDUBE MANE', 'Noojibailu', 'Ooru bailu', 'Paandi',
  'Paaremajulu', 'Paddichetti', 'Padichetti', 'Padonolana', 'Palangotu', 'Palepadi', 'Pandana',
  'Pandi Mane', 'Panjipalana', 'Panthale', 'Parameshwarana', 'Parchana', 'Pare', 'Parichana',
  'Parlakoti', 'Pattada', 'Pattemane', 'Peechemane', 'Perabai', 'Periyana', 'Perumunda', 'Pilthadka',
  'podnolana', 'Ponneti', 'Poojaira', 'Poondana', 'Porana mane', 'Porekunjilana', 'Poreyana',
  'Poyyakandira', 'Pudherenerana', 'Pudiyaneravana', 'Puljana', 'Puttannana', 'Ramkajje',
  'Sannajana', 'Sannamane', 'Setijana', 'Settajana', 'Shankarana', 'Sirakajje', 'Somet tira',
  'Somettira', 'Sonageri', 'Sulyakodi', 'Thalooru', 'Thammachna', 'Thekkade', 'Thootera', 'Thorera',
  'Thothyana', 'Thumthajjira', 'Thylabylu', 'Tumtajje', 'Udayana', 'Udiyana mane', 'Ududolira',
  'Uluvarana', 'Umbale mane', 'Urubail', 'Urunde', 'Vanchana', 'Viju', 'Wuluvarana', 'Yad ikeri',
  'Yaladaalu', 'Yaldaalu', 'Yankana', 'Yedikeri',
] as const;

export const FAMILY_NAMES = [...new Set([...FAMILY_NAME_SOURCE, ...FAMILY_NAME_ADDITIONS])]
  .sort((a, b) => a.localeCompare(b));
