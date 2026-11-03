/* Health Education AI — seed data (topics, code table, pre-generated clinical content).
   Content below is demo material written for the prototype: it is NOT a substitute for clinical review.
   Everything here is shown as "Approved" only because the demo provider is pre-signed on it. */
(function () {
  'use strict';
  function T(title, overview, causes, treatment, zones, warn, faqs, take) {
    return {
      title: title, overview: overview, causes: causes, treatment: treatment,
      actionPlan: {
        green:  { label: zones[0][0], items: zones[0][1] },
        yellow: { label: zones[1][0], items: zones[1][1] },
        red:    { label: zones[2][0], items: zones[2][1] }
      },
      warningSigns: warn,
      faqs: faqs.map(function (f) { return { q: f[0], a: f[1] }; }),
      takeaways: take
    };
  }

  var CONTENT = {};

  CONTENT.asthma = T('Living well with asthma',
    'Asthma is a long-term condition of the airways, the small tubes that carry air in and out of your lungs. When asthma flares up, the airways swell, make extra mucus and tighten. That makes it harder to breathe and can cause wheezing, coughing and a tight chest. Asthma cannot be cured, but with the right plan most people control it and live fully active lives.',
    ['Allergens such as pollen, dust mites, mold and pet dander', 'Colds, flu and other chest infections', 'Cigarette smoke, strong smells and air pollution', 'Exercise, cold air and sudden weather changes', 'Stress and strong emotions'],
    ['Take your daily controller medicine every day, even when you feel well. It calms swelling in the airways over time.',
     'Keep your quick-relief (rescue) inhaler with you. Use it at the first sign of symptoms.',
     'Use a spacer with your inhaler if your provider recommends one; it helps more medicine reach your lungs.',
     'Learn your triggers and avoid them where you can: wash bedding weekly in hot water, stay smoke-free, and check pollen counts.',
     'Get a flu shot every year and ask your provider about other vaccines.'],
    [['Green zone: doing well', ['No cough, wheeze or chest tightness', 'You can work, play and sleep normally', 'Take your controller medicine as prescribed']],
     ['Yellow zone: asthma is getting worse', ['Coughing, wheezing, chest tightness or waking at night', 'Use your rescue inhaler as your provider directed', 'If you are not back in the green zone within about 20–60 minutes, call your provider today']],
     ['Red zone: medical alert', ['Very short of breath, cannot speak a full sentence, or lips look blue', 'Rescue inhaler is not helping', 'Use your rescue inhaler and call 911 or go to the emergency room right away']]],
    ['Struggling to breathe or speak in full sentences', 'Lips or fingernails turning blue or gray', 'Rescue inhaler needed more often than every 4 hours, or not helping', 'Chest or neck muscles pulling in with each breath'],
    [['Can I exercise if I have asthma?', 'Yes. Most people with asthma can and should be active. Ask your provider whether to use your rescue inhaler before exercise, and warm up slowly.'],
     ['Do I still need my controller medicine when I feel fine?', 'Yes. Controller medicine works by preventing swelling, so it only works if you take it every day as prescribed.'],
     ['Is my rescue inhaler addictive?', 'No. But if you need it more than twice a week (not counting before exercise), your asthma may not be well controlled. Let your provider know.']],
    ['Take your controller medicine every day, even when you feel well.', 'Carry your rescue inhaler and use it at the first sign of symptoms.', 'Know your zones. Red zone means call 911.', 'Avoid your triggers and get a flu shot every year.']);

  CONTENT.asthma_es = T('Vivir bien con asma',
    'El asma es una enfermedad crónica de las vías respiratorias, los pequeños tubos que llevan el aire a los pulmones. Cuando el asma se activa, las vías respiratorias se inflaman, producen más mucosidad y se estrechan. Esto dificulta la respiración y puede causar silbidos, tos y opresión en el pecho. El asma no se cura, pero con un buen plan la mayoría de las personas la controla y lleva una vida activa.',
    ['Alérgenos como polen, ácaros del polvo, moho y caspa de mascotas', 'Resfriados, gripe y otras infecciones del pecho', 'Humo de cigarrillo, olores fuertes y contaminación', 'Ejercicio, aire frío y cambios bruscos del clima', 'Estrés y emociones fuertes'],
    ['Tome su medicina de control todos los días, aunque se sienta bien.', 'Lleve siempre su inhalador de rescate y úselo ante los primeros síntomas.', 'Use una cámara espaciadora si su proveedor se la recomienda.', 'Conozca sus desencadenantes y evítelos: lave la ropa de cama cada semana con agua caliente y no fume.', 'Vacúnese contra la gripe todos los años.'],
    [['Zona verde: todo bien', ['Sin tos, silbidos ni opresión en el pecho', 'Puede trabajar, jugar y dormir con normalidad', 'Siga tomando su medicina de control']],
     ['Zona amarilla: el asma empeora', ['Tos, silbidos, opresión en el pecho o despertares nocturnos', 'Use su inhalador de rescate según le indicó su proveedor', 'Si no mejora en 20 a 60 minutos, llame a su proveedor hoy']],
     ['Zona roja: alerta médica', ['Mucha falta de aire, no puede hablar una frase completa o los labios se ven azules', 'El inhalador de rescate no ayuda', 'Use el inhalador y llame al 911 o vaya a emergencias de inmediato']]],
    ['Dificultad para respirar o para hablar frases completas', 'Labios o uñas azulados o grisáceos', 'Necesita el inhalador de rescate con más frecuencia que cada 4 horas, o no le ayuda', 'Los músculos del pecho o del cuello se hunden al respirar'],
    [['¿Puedo hacer ejercicio si tengo asma?', 'Sí. La mayoría de las personas con asma pueden y deben estar activas. Pregunte a su proveedor si debe usar el inhalador antes de hacer ejercicio.'],
     ['¿Necesito la medicina de control si me siento bien?', 'Sí. Esta medicina previene la inflamación, por eso funciona solo si se toma todos los días.'],
     ['¿El inhalador de rescate causa adicción?', 'No. Pero si lo necesita más de dos veces por semana, su asma puede no estar bien controlada. Avise a su proveedor.']],
    ['Tome su medicina de control todos los días.', 'Lleve su inhalador de rescate y úselo ante los primeros síntomas.', 'Zona roja significa llamar al 911.', 'Evite sus desencadenantes y vacúnese contra la gripe.']);

  CONTENT.diabetes = T('Managing type 2 diabetes',
    'Type 2 diabetes means your body does not use insulin well, so sugar (glucose) builds up in your blood. Over time, high blood sugar can harm your eyes, kidneys, nerves, heart and feet. The good news: healthy eating, regular activity, medicine and routine check-ups can keep your sugar in a safe range and greatly lower those risks.',
    ['Your body resists insulin, often tied to extra weight, low activity and family history', 'Eating more calories and refined carbohydrates than the body can use', 'Aging and genetics', 'Some medicines, illness and stress can push blood sugar up'],
    ['Take your diabetes medicine exactly as prescribed, with meals when directed.',
     'Choose plates with half non-starchy vegetables, a quarter lean protein and a quarter whole-grain carbohydrate. Limit sugary drinks.',
     'Aim for about 150 minutes of brisk activity per week, such as walking 30 minutes on most days.',
     'Check your blood sugar when your provider asks and write the numbers down.',
     'Look at your feet every day, keep up with eye exams, and get your A1c checked about every 3 to 6 months.'],
    [['Green zone: in your target range', ['Blood sugar mostly in the range your provider set (often 80–130 before meals)', 'No unusual thirst or tiredness', 'Keep up your routine']],
     ['Yellow zone: needs attention', ['Blood sugar above your target for several days, or above 250 once', 'Very thirsty, urinating more, blurry vision, or sick with a cold or flu', 'Call your provider today. Do not stop your medicine unless told to.']],
     ['Red zone: urgent', ['Blood sugar below 70 that does not come up after treating with fast sugar, or you feel confused or faint', 'Blood sugar over 300 with vomiting, belly pain or fast breathing', 'Call 911 or go to the emergency room']]],
    ['Shaky, sweaty, confused or very sleepy (low blood sugar)', 'Vomiting, belly pain, fruity breath or fast breathing', 'A foot sore, blister or cut that is not healing', 'Sudden vision changes, chest pain or weakness on one side'],
    [['What should I do if my blood sugar is low?', 'If you feel shaky or sweaty and your sugar is under 70, have about 15 grams of fast sugar (half a cup of juice or 3–4 glucose tablets), recheck in 15 minutes, and repeat if still low. Then eat a snack.'],
     ['Can I still eat carbohydrates?', 'Yes. Carbohydrates are part of a healthy diet. The goal is steady portions and choosing whole grains, beans and vegetables over sweets and sugary drinks.'],
     ['What is an A1c?', 'The A1c is a blood test showing your average blood sugar over about 3 months. Many adults aim for under 7%, but your provider will set your personal goal.']],
    ['Take medicine as prescribed and check sugar when asked.', 'Fill half your plate with vegetables; skip sugary drinks.', 'Move about 150 minutes a week.', 'Check your feet daily and keep your eye, kidney and A1c checks.']);

  CONTENT.hypertension = T('Controlling high blood pressure',
    'High blood pressure (hypertension) means the force of blood against your artery walls stays too high. It usually has no symptoms, which is why it is called the “silent” condition. Over time it raises the risk of heart attack, stroke, kidney disease and vision problems. Most people can bring it down with healthy habits and, when needed, daily medicine.',
    ['Too much salt (sodium) in food', 'Extra weight, little physical activity, or too much alcohol', 'Family history and getting older', 'Stress, poor sleep or sleep apnea', 'Some medicines, including decongestants and anti-inflammatory pain pills'],
    ['Take your blood pressure medicine every day, even if you feel fine. Do not stop without talking to your provider.',
     'Aim for less than 2,300 mg of sodium per day (ideally 1,500 mg). Read labels, and cook more at home.',
     'Eat plenty of fruits, vegetables, whole grains and low-fat dairy (the DASH eating plan).',
     'Be active about 30 minutes most days, keep a healthy weight, limit alcohol, and do not smoke.',
     'Check your blood pressure at home as advised: sit quietly for 5 minutes, feet flat, arm at heart level.'],
    [['Green zone: on target', ['Home blood pressure is below your goal (often under 130/80)', 'No headache, chest pain or vision changes', 'Keep taking medicine and following your plan']],
     ['Yellow zone: call your provider', ['Readings are above goal on several days', 'Dizziness, ankle swelling, or new side effects from medicine', 'Write down your readings and call the office within a day or two']],
     ['Red zone: emergency', ['180/120 or higher AND chest pain, trouble breathing, weakness, numbness, confusion or severe headache: call 911', '180/120 or higher without symptoms: rest 5 minutes, recheck, and call your provider right away']]],
    ['Chest pain or pressure', 'Sudden severe headache, confusion or trouble speaking', 'Numbness or weakness in the face, arm or leg', 'Sudden vision changes or shortness of breath'],
    [['If I feel fine, do I still need medicine?', 'Yes. High blood pressure often causes no symptoms, but it still damages your body. Medicine keeps it down.'],
     ['How much salt is too much?', 'Try to stay under 2,300 mg of sodium a day. Most of it hides in packaged, restaurant and processed foods, not the salt shaker.'],
     ['What cuff should I use at home?', 'An automatic upper-arm cuff that fits well. Bring it to a visit so we can compare it with the office reading.']],
    ['Medicine every day, even when you feel fine.', 'Aim for under 2,300 mg of sodium and eat the DASH way.', 'Check your pressure at home and keep a log.', '180/120 with symptoms means call 911.']);

  CONTENT.pancreatitis = T('Recovering from pancreatitis',
    'Pancreatitis is swelling of the pancreas, a gland behind your stomach that makes digestive juices and insulin. It can come on suddenly (acute) or last for years (chronic). It often causes pain in the upper belly that can spread to the back, along with nausea and vomiting. Most people with mild acute pancreatitis recover after a few days of rest and care in the hospital.',
    ['Gallstones', 'Heavy alcohol use', 'Very high triglycerides (blood fats)', 'Some medicines, certain infections, or injury to the belly', 'Sometimes the cause is not found'],
    ['Do not drink alcohol. It is the most important step to prevent another attack.',
     'Eat small, low-fat meals and drink plenty of fluids as your care team advises.',
     'Take pain medicine only as prescribed. Do not take extra over-the-counter pain relievers without asking.',
     'If gallstones caused it, your provider may talk with you about removing the gallbladder.',
     'Do not smoke. Smoking raises the risk of repeat attacks.'],
    [['Green zone: recovering well', ['Eating small low-fat meals without pain', 'Drinking fluids and passing urine normally', 'No alcohol, keep your follow-up visits']],
     ['Yellow zone: call your provider today', ['Mild belly pain or nausea returns after eating', 'Less appetite, loose or greasy stools, or weight loss', 'Dark urine or feeling dehydrated']],
     ['Red zone: go to the emergency room', ['Severe belly pain that does not ease', 'Vomiting that will not stop, or you cannot keep fluids down', 'Fever, yellow skin or eyes, fast heartbeat or feeling faint']]],
    ['Severe or worsening belly pain, especially spreading to your back', 'Repeated vomiting or unable to drink fluids', 'Fever or shaking chills', 'Yellow skin or eyes, or very dark urine'],
    [['Can I ever drink alcohol again?', 'If alcohol caused your pancreatitis, no. Even if it was not the cause, ask your provider; many people are advised to avoid it completely.'],
     ['What can I eat?', 'Start with small, low-fat, balanced meals: soups, rice, vegetables, lean protein. Avoid fried and greasy foods and very large meals.'],
     ['Will it come back?', 'It can. Avoiding alcohol and smoking, treating gallstones, and keeping blood fats under control lower the chance.']],
    ['No alcohol and no smoking.', 'Small, low-fat meals and plenty of fluids.', 'Severe pain, vomiting or fever means go to the ER.', 'Keep your follow-up visits to find and treat the cause.']);

  CONTENT.anklesprain = T('Caring for an ankle sprain',
    'An ankle sprain is a stretched or torn ligament, the tough bands that hold your ankle bones together. It usually happens when you roll or twist your foot. Pain, swelling and bruising are common. Most sprains heal in 2 to 6 weeks with rest, ice, compression and a gradual return to movement.',
    ['Rolling the foot while walking or running on uneven ground', 'Landing awkwardly after a jump or sports move', 'Wearing unstable shoes such as high heels', 'A past sprain that left the ankle weaker'],
    ['Rest: protect the ankle for the first 1 to 2 days and use crutches if walking hurts.',
     'Ice: 15 to 20 minutes every 2 to 3 hours while awake for the first 2 days. Put a cloth between ice and skin.',
     'Compression: wrap with an elastic bandage, snug but not tight.',
     'Elevation: keep the foot above heart level when sitting or lying down.',
     'Start gentle ankle circles and stretching as pain allows, then balance and strength exercises as advised by your provider or physical therapist.'],
    [['Green zone: healing', ['Swelling and pain are going down each day', 'You can put weight on the foot and walk with little pain', 'Keep doing your gentle exercises']],
     ['Yellow zone: not improving', ['Pain or swelling not improving after 3 to 5 days', 'The ankle feels loose or gives way', 'Call your provider to be re-checked']],
     ['Red zone: get care today', ['You cannot put any weight on the foot, or it looks out of shape', 'Numbness, a cold or pale foot, or a bluish color', 'Severe pain right after the injury or a “pop” with immediate swelling']]],
    ['Unable to take four steps or bear weight', 'Numbness, tingling or a pale, cool foot', 'Visible deformity of the ankle or foot', 'Pain directly over the bony part of the ankle or foot'],
    [['Should I use heat or ice?', 'Use ice for the first 2 days to ease swelling. After that, gentle warmth before stretching can help stiffness.'],
     ['When can I return to sports?', 'When swelling is gone, you can walk, hop and cut without pain, and your ankle feels as strong as the other. Your provider or therapist can guide you.'],
     ['Do I need an X-ray?', 'Your provider decides based on where it hurts and whether you can walk. An X-ray is used to check for a broken bone.']],
    ['Rest, ice, compress and raise the ankle.', 'Start gentle movement as pain allows.', 'Cannot bear weight or foot is numb? Get care today.', 'Build balance and strength before returning to sports.']);

  CONTENT.breastfeeding = T('Getting started with breastfeeding',
    'Breast milk gives your baby the nutrition and antibodies they need in the first months of life. Breastfeeding is a skill that mother and baby learn together, and it is normal for it to take practice. A good latch, frequent feeding and support from your care team make a big difference.',
    ['Milk supply works on supply and demand: more feeding or pumping tells your body to make more', 'Sore nipples are most often caused by a shallow latch', 'Engorgement can happen when milk first “comes in” around day 3 to 5', 'Missed or very long gaps between feeds can lead to blocked ducts'],
    ['Feed on demand, about 8 to 12 times in 24 hours in the early weeks. Watch for hunger cues such as hands to mouth and rooting.',
     'Check the latch: baby’s mouth is wide, lips turned out, with more of the areola in the mouth and a comfortable pull, not pinching pain.',
     'Hold baby tummy to tummy, with nose to nipple, and support the head and neck.',
     'Drink to thirst, eat regular balanced meals, and rest when you can.',
     'Ask your provider before taking any new medicine or supplement while breastfeeding.'],
    [['Green zone: going well', ['Baby feeds 8 to 12 times a day and seems content afterward', 'By day 5, at least 6 wet diapers and 3 or more yellow stools a day', 'Baby is gaining weight as expected']],
     ['Yellow zone: call your care team', ['Sore, cracked nipples or pain throughout the feed', 'Hard, painful, full breasts or a tender lump', 'Fewer wet diapers than expected, or feeds feel very long']],
     ['Red zone: urgent', ['Fever of 100.4°F (38°C) or higher with red, hot, painful breast and flu-like aches', 'Baby is very sleepy, hard to wake, has no wet diaper in 8 hours, or yellow skin that is spreading', 'Call your provider now or go to urgent care']]],
    ['Fever of 100.4°F (38°C) or higher with breast redness or pain', 'Baby with fewer than 6 wet diapers a day after day 5', 'Baby is very sleepy, will not feed, or has yellowing skin or eyes', 'Bleeding or pus from the nipple'],
    [['How do I know my baby is getting enough?', 'Look for 6 or more wet diapers and 3 or more yellow stools a day after day 5, regular swallowing during feeds, and steady weight gain at check-ups.'],
     ['Does breastfeeding have to hurt?', 'Some tenderness in the first days is common, but ongoing pain is not. It usually means the latch needs adjusting. A lactation consultant can help.'],
     ['Can I pump and store milk?', 'Yes. Freshly expressed milk can stay at room temperature for up to about 4 hours, in the fridge for up to 4 days, and in the freezer for about 6 months.']],
    ['Feed often, about 8 to 12 times a day at first.', 'A deep, comfortable latch prevents most pain.', 'Count wet diapers to know baby is getting enough.', 'Fever with a red breast needs prompt care.']);

  // ICD-10 / SNOMED lookup (small demo table)
  var CODES = [
    { type: 'ICD-10', code: 'J45.909', desc: 'Unspecified asthma, uncomplicated', topic: 'asthma' },
    { type: 'ICD-10', code: 'J45.40',  desc: 'Moderate persistent asthma, uncomplicated', topic: 'asthma' },
    { type: 'ICD-10', code: 'E11.9',   desc: 'Type 2 diabetes mellitus without complications', topic: 'diabetes' },
    { type: 'ICD-10', code: 'E11.65',  desc: 'Type 2 diabetes mellitus with hyperglycemia', topic: 'diabetes' },
    { type: 'ICD-10', code: 'E10.9',   desc: 'Type 1 diabetes mellitus without complications', topic: 'diabetes' },
    { type: 'ICD-10', code: 'I10',     desc: 'Essential (primary) hypertension', topic: 'hypertension' },
    { type: 'ICD-10', code: 'K85.90',  desc: 'Acute pancreatitis without necrosis or infection', topic: 'pancreatitis' },
    { type: 'ICD-10', code: 'K86.1',   desc: 'Other chronic pancreatitis', topic: 'pancreatitis' },
    { type: 'ICD-10', code: 'S93.409A',desc: 'Sprain of unspecified ligament of ankle, initial encounter', topic: 'anklesprain' },
    { type: 'ICD-10', code: 'Z39.1',   desc: 'Encounter for care and examination of lactating mother', topic: 'breastfeeding' },
    { type: 'ICD-10', code: 'E78.5',   desc: 'Hyperlipidemia, unspecified', topic: 'cholesterol' },
    { type: 'ICD-10', code: 'M19.90',  desc: 'Unspecified osteoarthritis, unspecified site', topic: 'arthritis' },
    { type: 'ICD-10', code: 'I49.9',   desc: 'Cardiac arrhythmia, unspecified', topic: 'arrhythmias' },
    { type: 'ICD-10', code: 'H10.9',   desc: 'Unspecified conjunctivitis', topic: 'conjunctivitis' },
    { type: 'ICD-10', code: 'R50.9',   desc: 'Fever, unspecified', topic: 'fever' },
    { type: 'SNOMED CT', code: '195967001', desc: 'Asthma (disorder)', topic: 'asthma' },
    { type: 'SNOMED CT', code: '44054006',  desc: 'Diabetes mellitus type 2 (disorder)', topic: 'diabetes' },
    { type: 'SNOMED CT', code: '38341003',  desc: 'Hypertensive disorder (disorder)', topic: 'hypertension' },
    { type: 'SNOMED CT', code: '75694006',  desc: 'Acute pancreatitis (disorder)', topic: 'pancreatitis' },
    { type: 'SNOMED CT', code: '44465007',  desc: 'Sprain of ankle (disorder)', topic: 'anklesprain' },
    { type: 'SNOMED CT', code: '413712001', desc: 'Breastfeeding (observable entity)', topic: 'breastfeeding' }
  ];

  var SPECIALTIES = ['FAMILY PRACTICE', 'ALLERGY/IMMUNOLOGY', 'ORTHOPEDICS', 'PODIATRY', 'CARDIOLOGY', 'ENDOCRINOLOGY', 'PULMONOLOGY', 'GASTROENTEROLOGY', 'OBSTETRICS/GYNECOLOGY', 'PEDIATRICS', 'OPHTHALMOLOGY', 'INTERNAL MEDICINE'];

  // [name, specialty, entryDate, topicKey|null, code|null]
  var SEED = [
    ['PANCREATITIS', 'FAMILY PRACTICE', '10/03/2014', 'pancreatitis', 'K85.90', 'link'],
    ['ANAPHYLAXIS', 'ALLERGY/IMMUNOLOGY', '09/13/2013'],
    ['ARTHRITIS', 'ORTHOPEDICS', '09/13/2013', null, 'M19.90'],
    ['ANKLE SPRAIN', 'PODIATRY', '09/13/2013', 'anklesprain', 'S93.409A'],
    ['BREAST HEALTH', 'FAMILY PRACTICE', '01/30/2013'],
    ['BREASTFEEDING', 'FAMILY PRACTICE', '01/30/2013', 'breastfeeding', 'Z39.1'],
    ['ARRHYTHMIAS', 'FAMILY PRACTICE', '01/30/2013', null, 'I49.9'],
    ['ABDOMINAL PAIN BY BUMC', 'FAMILY PRACTICE', '01/30/2013'],
    ["ADDISON'S DISEASE", 'FAMILY PRACTICE', '01/30/2013'],
    ['ASTHMA', 'FAMILY PRACTICE', '01/30/2013', 'asthma', 'J45.909'],
    ['BRONCHIECTASIS', 'FAMILY PRACTICE', '01/30/2013'],
    ['CONTACT LENSES', 'FAMILY PRACTICE', '01/30/2013'],
    ['CONJUNCTIVITIS', 'FAMILY PRACTICE', '01/30/2013', null, 'H10.9'],
    ['CHOLESTEROL', 'FAMILY PRACTICE', '01/30/2013', null, 'E78.5'],
    ['DIET', 'FAMILY PRACTICE', '01/30/2013'],
    ['DIABETES MELLITUS', 'FAMILY PRACTICE', '01/30/2013', 'diabetes', 'E11.9'],
    ['CHECKLIST FOR TAKING MEDICATION', 'FAMILY PRACTICE', '01/30/2013'],
    ['DIABETIC KETOACIDOSIS', 'FAMILY PRACTICE', '01/30/2013'],
    ['HYPERTENSION', 'FAMILY PRACTICE', '01/30/2013', 'hypertension', 'I10'],
    ['HEART FAILURE', 'CARDIOLOGY', '01/30/2013'],
    ['MIGRAINE', 'FAMILY PRACTICE', '01/30/2013'],
    ['OSTEOPOROSIS', 'FAMILY PRACTICE', '01/30/2013'],
    ['SMOKING CESSATION', 'FAMILY PRACTICE', '01/30/2013'],
    ['URINARY TRACT INFECTION', 'FAMILY PRACTICE', '01/30/2013']
  ];

  window.HE_DATA = { CONTENT: CONTENT, CODES: CODES, SPECIALTIES: SPECIALTIES, SEED: SEED };
})();
