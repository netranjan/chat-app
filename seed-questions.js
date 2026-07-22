require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('./models/Question');   // make sure this file exists

// All 80+ questions (without IDs - they will be added automatically)
const allQuestions = [
    {
        q: "Which saree is traditionally worn by Maharashtrian brides?",
        opts: ["Nauvari", "Kanjivaram", "Banarasi", "Chanderi"],
        ans: 0,
        fact: "The nine-yard Nauvari saree is a symbol of grace and is draped in a unique style."
    },
    {
        q: "Which festival is celebrated as the Marathi New Year?",
        opts: ["Gudi Padwa", "Diwali", "Holi", "Makar Sankranti"],
        ans: 0,
        fact: "Gudi Padwa marks the beginning of the Hindu New Year for Maharashtrians."
    },
    {
        q: "What is the traditional male attire in Punjab called?",
        opts: ["Kurta-Pajama", "Dhoti-Kurta", "Sherwani", "Pathani"],
        ans: 0,
        fact: "Kurta-Pajama is a classic and comfortable outfit worn by Punjabi men."
    },
    {
        q: "Which sweet is a Maharashtrian specialty made during Ganesh Chaturthi?",
        opts: ["Modak", "Jalebi", "Gulab Jamun", "Laddoo"],
        ans: 0,
        fact: "Modak is considered Lord Ganesha's favorite sweet."
    },
    {
        q: "Which dance form is associated with Maharashtra?",
        opts: ["Lavani", "Bhangra", "Giddha", "Kathak"],
        ans: 0,
        fact: "Lavani is a vibrant folk dance known for its powerful rhythmic movements."
    },
    {
        q: "Which crop is Punjab famously known as the 'Granary of India' for?",
        opts: ["Rice", "Wheat", "Sugarcane", "Cotton"],
        ans: 1,
        fact: "Punjab's fertile lands produce a significant portion of India's wheat."
    },
    {
        q: "Which festival in Punjab marks the Sikh New Year?",
        opts: ["Baisakhi", "Lohri", "Holi", "Diwali"],
        ans: 0,
        fact: "Baisakhi is a harvest festival that also commemorates the formation of the Khalsa."
    },
    {
        q: "Which Maharashtrian dish is made with crushed wheat and jaggery?",
        opts: ["Puran Poli", "Bhakri", "Kharvas", "Shrikhand"],
        ans: 0,
        fact: "Puran Poli is a sweet flatbread enjoyed during festivals."
    },
    {
        q: "Which headgear is traditionally worn by Sikh men in Punjab?",
        opts: ["Turban", "Pagdi", "Patka", "Chandni"],
        ans: 1,
        fact: "The Pagdi (turban) is an integral part of Sikh identity and pride."
    },
    {
        q: "Which famous dance form originated in Punjab?",
        opts: ["Bhangra", "Lavani", "Garba", "Dandiya"],
        ans: 0,
        fact: "Bhangra is a high-energy dance that originated in the Punjab region."
    },
    {
        q: "Which Maharashtrian festival involves married women celebrating their marital status?",
        opts: ["Mangala Gauri", "Karwa Chauth", "Teej", "Vat Savitri"],
        ans: 0,
        fact: "Mangala Gauri is a festival where women worship Goddess Gauri for marital bliss."
    },
    {
        q: "What is the traditional Punjabi footwear called?",
        opts: ["Jutti", "Kolhapuri", "Mojari", "Chappal"],
        ans: 0,
        fact: "Punjabi Juttis are handcrafted footwear known for their intricate embroidery."
    },
    {
        q: "Which Maharashtrian dish is known as the 'queen of sweets'?",
        opts: ["Puran Poli", "Modak", "Shrikhand", "Basundi"],
        ans: 2,
        fact: "Shrikhand is a creamy, rich dessert made from strained yogurt."
    },
    {
        q: "Which festival is also known as the 'Festival of Love' in Punjab?",
        opts: ["Lohri", "Baisakhi", "Holi", "Teej"],
        ans: 2,
        fact: "Holi is celebrated with colours and joy, spreading love and happiness."
    },
    {
        q: "Which Maharashtrian snack is made from flattened rice and peanuts?",
        opts: ["Chivda", "Farsan", "Kanda Bhaji", "Bhel"],
        ans: 0,
        fact: "Chivda is a crispy and savory snack popular during the monsoon."
    },
    {
        q: "Which state is known as the 'Land of Five Rivers'?",
        opts: ["Punjab", "Maharashtra", "Rajasthan", "Uttar Pradesh"],
        ans: 0,
        fact: "Punjab's name means 'land of five rivers' — Beas, Chenab, Jhelum, Ravi, and Sutlej."
    },
    {
        q: "What is the traditional Maharashtrian jewellery worn by married women?",
        opts: ["Mangalsutra", "Nath", "Bangles", "All of these"],
        ans: 3,
        fact: "Each piece of jewellery holds cultural and emotional significance in Maharashtra."
    },
    {
        q: "Which Punjabi dish is known as the 'national dish' of Punjab?",
        opts: ["Sarson da Saag and Makki di Roti", "Butter Chicken", "Dal Makhani", "Chole Bhature"],
        ans: 0,
        fact: "This wholesome combination is a staple during winter in Punjab."
    },
    {
        q: "Which Maharashtrian ceremony marks the coming-of-age of a girl?",
        opts: ["Munj", "Upanayan", "Halad", "Mehendi"],
        ans: 0,
        fact: "Munj is a traditional rite of passage for girls in Maharashtra."
    },
    {
        q: "Which dance is performed by women in Punjab during celebrations?",
        opts: ["Giddha", "Bhangra", "Lavani", "Garba"],
        ans: 0,
        fact: "Giddha is a lively and graceful dance performed by Punjabi women."
    },
    {
        q: "Which Maharashtrian dish is made from curd and sugar?",
        opts: ["Shrikhand", "Kheer", "Basundi", "Raita"],
        ans: 0,
        fact: "Shrikhand is a sweet and tangy dessert made from hung curd."
    },
    {
        q: "Which festival involves worshipping the Sun God in Punjab?",
        opts: ["Lohri", "Makar Sankranti", "Baisakhi", "Holi"],
        ans: 1,
        fact: "Makar Sankranti is a harvest festival dedicated to the Sun God."
    },
    {
        q: "Which traditional Maharashtrian utensil is used to make bhakri?",
        opts: ["Tava", "Tondale", "Handi", "Kadhai"],
        ans: 1,
        fact: "The Tondale is a flat cast-iron pan used to cook bhakri."
    },
    {
        q: "Which state celebrates 'Makar Sankranti' with great fervor?",
        opts: ["Maharashtra", "Punjab", "Both", "Neither"],
        ans: 2,
        fact: "Makar Sankranti is celebrated across India with kite flying and feasting."
    },
    {
        q: "What is the traditional Punjabi wedding dress for the groom?",
        opts: ["Sherwani", "Kurta Pajama", "Dhoti", "Safari"],
        ans: 0,
        fact: "The Sherwani is a regal attire that exudes elegance and tradition."
    },
    {
        q: "Which Maharashtrian food is eaten during fasting days?",
        opts: ["Sabudana Khichdi", "Puran Poli", "Bhakri", "Thalipeeth"],
        ans: 0,
        fact: "Sabudana Khichdi is a light and comforting meal during fasts."
    },
    {
        q: "Which Punjabi tradition involves the bride wearing red and gold?",
        opts: ["Salwar Kameez", "Lehenga", "Ghagra", "Saree"],
        ans: 1,
        fact: "Red symbolizes prosperity and love in Punjabi weddings."
    },
    {
        q: "Which Maharashtrian folk theatre form is famous?",
        opts: ["Tamasha", "Nautanki", "Bhavai", "Yakshagana"],
        ans: 0,
        fact: "Tamasha is a lively performance art combining music, dance, and drama."
    },
    {
        q: "Which festival is known as the 'festival of dolls' in Maharashtra?",
        opts: ["Gudi Padwa", "Navratri", "Bhai Dooj", "Baisakhi"],
        ans: 1,
        fact: "During Navratri, 'Golu' or doll displays are arranged in many Maharashtrian homes."
    },
    {
        q: "Which Punjabi dish is made from chickpeas and bread?",
        opts: ["Chole Bhature", "Dal Makhani", "Sarson ka Saag", "Pindi Chole"],
        ans: 0,
        fact: "Chole Bhature is a popular and hearty Punjabi dish."
    },
    {
        q: "Which Maharashtrian tradition involves gifting a coconut to the bride?",
        opts: ["Munj", "Halad", "Sakhar Puda", "Tilak"],
        ans: 2,
        fact: "Sakhar Puda is a ritual where coconut is gifted as a symbol of prosperity."
    },
    {
        q: "Which Punjabi word means 'a beautiful woman'?",
        opts: ["Sohni", "Gori", "Kudi", "Heer"],
        ans: 0,
        fact: "Sohni is a term of endearment used for a beautiful woman."
    },
    {
        q: "Which Maharashtrian sweet is made using coconut and sugar?",
        opts: ["Karanji", "Modak", "Puran Poli", "Anarsa"],
        ans: 0,
        fact: "Karanji is a crescent-shaped sweet filled with coconut and sugar."
    },
    {
        q: "Which state celebrates 'Lohri' as a harvest festival?",
        opts: ["Punjab", "Maharashtra", "Rajasthan", "Bihar"],
        ans: 0,
        fact: "Lohri is a winter harvest festival celebrated with bonfires and sweets."
    },
    {
        q: "Which Maharashtrian fabric is known for its light weight and comfort?",
        opts: ["Paithani", "Kanjivaram", "Chanderi", "Linen"],
        ans: 0,
        fact: "Paithani is a silk fabric with intricate gold borders, prized for its elegance."
    },
    {
        q: "Which Punjabi word is used to wish 'May you live long'?",
        opts: ["Chardi Kala", "Sat Sri Akal", "Jeeve", "Rabb Rakha"],
        ans: 0,
        fact: "Chardi Kala is an expression of positivity and well-being."
    },
    {
        q: "Which Maharashtrian dish is made of fermented rice?",
        opts: ["Khichdi", "Kanji", "Dosa", "Idli"],
        ans: 1,
        fact: "Kanji is a fermented rice drink that aids digestion."
    },
    {
        q: "Which Punjabi folk instrument is played during Bhangra?",
        opts: ["Dhol", "Tabla", "Harmonium", "Sitar"],
        ans: 0,
        fact: "The Dhol is the heart of Bhangra music, setting the rhythm for dance."
    },
    {
        q: "Which Maharashtrian tradition involves the groom applying tilak on the bride?",
        opts: ["Halad", "Mangal Phera", "Saptapadi", "Kanyadaan"],
        ans: 0,
        fact: "Halad is the turmeric ceremony, a sacred pre-wedding ritual."
    },
    {
        q: "Which Punjabi dish is made with lentils and is a staple in every home?",
        opts: ["Dal Makhani", "Rajma", "Chole", "Lobia"],
        ans: 0,
        fact: "Dal Makhani is a rich and creamy lentil dish enjoyed across Punjab."
    },
    {
        q: "Which Maharashtrian festival celebrates women and their marital bliss?",
        opts: ["Kojagiri", "Vat Savitri", "Mangala Gauri", "Both B and C"],
        ans: 3,
        fact: "Both Vat Savitri and Mangala Gauri are festivals honoring women and marriage."
    },
    {
        q: "Which Maharashtrian sweet is prepared during Diwali?",
        opts: ["Anarsa", "Jalebi", "Gulab Jamun", "Rasgulla"],
        ans: 0,
        fact: "Anarsa is a traditional Diwali sweet made from rice flour and jaggery."
    },
    {
        q: "Which Punjabi drink is made from fermented mangoes?",
        opts: ["Lassi", "Kanji", "Chhach", "Aam Panna"],
        ans: 1,
        fact: "Kanji is a tangy drink made from fermented mangoes and spices."
    },
    {
        q: "Which Maharashtrian garment is worn by women during traditional ceremonies?",
        opts: ["Nauvari Saree", "Choli", "Ghaghra", "Salwar"],
        ans: 0,
        fact: "The Nauvari saree is a nine-yard drape that is both elegant and practical."
    },
    {
        q: "Which Maharashtrian folk song is sung during weddings?",
        opts: ["Powada", "Lavani", "Bhavgeet", "Ovi"],
        ans: 3,
        fact: "Ovi are traditional songs sung by women during weddings and ceremonies."
    },
    {
        q: "Which state is known for the 'Lavani' dance form?",
        opts: ["Maharashtra", "Punjab", "Karnataka", "Andhra Pradesh"],
        ans: 0,
        fact: "Lavani is a folk dance of Maharashtra known for its rhythm and storytelling."
    },
    {
        q: "Which Punjabi wedding ritual involves the couple walking around the holy fire?",
        opts: ["Anand Karaj", "Pheras", "Varmala", "Kanyadaan"],
        ans: 0,
        fact: "Anand Karaj is the Sikh wedding ceremony, which includes circumambulation around the Guru Granth Sahib."
    },
    {
        q: "Which Maharashtrian snack is made from besan (gram flour)?",
        opts: ["Chivda", "Farsan", "Kanda Bhaji", "Puran Poli"],
        ans: 1,
        fact: "Farsan is a savory snack made from gram flour and spices."
    },
    {
        q: "Which Maharashtrian festival involves unmarried girls swinging on a jhula?",
        opts: ["Mangala Gauri", "Gudi Padwa", "Makar Sankranti", "Holi"],
        ans: 0,
        fact: "During Mangala Gauri, girls celebrate with swings and songs."
    },
    {
        q: "Which Punjabi dish is a stuffed bread that is immensely popular?",
        opts: ["Aloo Paratha", "Paneer Paratha", "Gobi Paratha", "All of these"],
        ans: 3,
        fact: "Stuffed parathas are a breakfast favourite in Punjab."
    },
    {
        q: "Which Maharashtrian sweet is made with coconut and khoya?",
        opts: ["Karanji", "Modak", "Puran Poli", "Anarsa"],
        ans: 0,
        fact: "Karanji is a delicious sweet filled with coconut and khoya."
    },
    {
        q: "Which state celebrates 'Punjab Day'?",
        opts: ["Punjab", "Maharashtra", "Haryana", "Himachal Pradesh"],
        ans: 0,
        fact: "Punjab Day is celebrated to honour the state's formation."
    },
    {
        q: "Which Maharashtrian tradition involves the couple taking seven steps together?",
        opts: ["Saptapadi", "Mangal Phera", "Kanyadaan", "Halad"],
        ans: 0,
        fact: "Saptapadi is the seven-step ritual that is central to Hindu weddings."
    },
    {
        q: "Which Maharashtrian snack is made of rice flour and chutney?",
        opts: ["Idli", "Dosa", "Dhokla", "Khandvi"],
        ans: 1,
        fact: "Dosa is a crispy crepe made from fermented rice batter."
    },
    {
        q: "Which state is famous for its 'Tanpat' saris?",
        opts: ["Maharashtra", "Punjab", "Tamil Nadu", "Odisha"],
        ans: 0,
        fact: "Tanpat sarees are a traditional handloom weave from Maharashtra."
    },
    {
        q: "Which Punjabi festival is celebrated with the planting of wheat?",
        opts: ["Baisakhi", "Lohri", "Makar Sankranti", "Holi"],
        ans: 0,
        fact: "Baisakhi marks the beginning of the harvest season in Punjab."
    },
    {
        q: "Which state is known for its 'Waghya-Murya' folk dance?",
        opts: ["Maharashtra", "Punjab", "Rajasthan", "Gujarat"],
        ans: 0,
        fact: "Waghya-Murya is a folk dance that depicts the hunting of a tiger."
    },
    {
        q: "Which Punjabi dish is made with yoghurt and is a summer staple?",
        opts: ["Lassi", "Chhach", "Raita", "All of these"],
        ans: 3,
        fact: "Lassi, Chhach, and Raita are all refreshing yoghurt-based drinks and sides."
    },
    {
        q: "Which Maharashtrian festival is associated with the goddess Gauri?",
        opts: ["Mangala Gauri", "Gudi Padwa", "Navratri", "Baisakhi"],
        ans: 0,
        fact: "Mangala Gauri is a festival dedicated to the goddess Gauri, the consort of Shiva."
    },
    {
        q: "Which state is known for its vibrant 'Ganesh Chaturthi' celebrations?",
        opts: ["Maharashtra", "Punjab", "Kerala", "Tamil Nadu"],
        ans: 0,
        fact: "Ganesh Chaturthi is celebrated with great enthusiasm in Maharashtra."
    },
    {
        q: "Which Punjabi dish is a type of flatbread made in tandoor?",
        opts: ["Naan", "Roti", "Paratha", "Kulcha"],
        ans: 0,
        fact: "Naan is a leavened bread baked in a tandoor, popular in Punjabi cuisine."
    },
    {
        q: "Which Maharashtrian tradition involves applying turmeric paste to the bride and groom?",
        opts: ["Halad", "Munj", "Saptapadi", "Mangal Phera"],
        ans: 0,
        fact: "Halad ceremony uses turmeric paste for purification and blessings."
    },
    {
        q: "Which state is known for its 'Bhangra' and 'Giddha' dances?",
        opts: ["Punjab", "Maharashtra", "Gujarat", "Rajasthan"],
        ans: 0,
        fact: "Punjab is the home of Bhangra and Giddha, the energetic folk dances."
    },
    {
        q: "Which Maharashtrian ritual involves the bride's brother giving her away?",
        opts: ["Kanyadaan", "Munj", "Halad", "Sakhar Puda"],
        ans: 0,
        fact: "Kanyadaan is a sacred ritual where the brother gives the bride away."
    },
    {
        q: "Which state is famous for its 'Mumbai' and 'Pune' cities?",
        opts: ["Maharashtra", "Punjab", "Karnataka", "Gujarat"],
        ans: 0,
        fact: "Mumbai and Pune are major cities in Maharashtra known for their culture and history."
    },
    {
        q: "Which Maharashtrian sweet is a winter specialty?",
        opts: ["Tilgul", "Modak", "Shrikhand", "Puran Poli"],
        ans: 0,
        fact: "Tilgul is a sweet made of sesame and jaggery, traditionally eaten during winter."
    },
    {
        q: "Which Punjabi word means 'love' or 'affection'?",
        opts: ["Ishq", "Pyar", "Muhabbat", "All of these"],
        ans: 3,
        fact: "Ishq, Pyar, and Muhabbat are all Urdu/Punjabi words for love."
    },
    {
        q: "Which Maharashtrian snack is made from rice flour and is steamed?",
        opts: ["Idli", "Dosa", "Dhokla", "Modak"],
        ans: 0,
        fact: "Idli is a steamed rice cake, a popular breakfast in Maharashtra."
    },
    {
        q: "Which Punjabi word means 'a celebration'?",
        opts: ["Mela", "Utsav", "Khedan", "Tehar"],
        ans: 0,
        fact: "Mela is a large gathering that celebrates culture and traditions."
    },
    {
        q: "Which state is known for its 'Kolhapuri' footwear?",
        opts: ["Maharashtra", "Punjab", "Rajasthan", "Gujarat"],
        ans: 0,
        fact: "Kolhapuri chappals are a traditional handcrafted footwear from Maharashtra."
    },
    {
        q: "Which Punjabi word means 'a close friend'?",
        opts: ["Yaar", "Mitr", "Dost", "Sakhi"],
        ans: 0,
        fact: "Yaar is a term of endearment for a close friend in Punjabi."
    },
    {
        q: "Which Maharashtrian festival celebrates cattle and their importance?",
        opts: ["Polhu", "Makar Sankranti", "Gudi Padwa", "Baisakhi"],
        ans: 0,
        fact: "Polhu is a festival where cattle are worshipped for their role in agriculture."
    },
    {
        q: "Which state is known for its 'Paithani' sarees?",
        opts: ["Maharashtra", "Punjab", "Karnataka", "Tamil Nadu"],
        ans: 0,
        fact: "Paithani sarees are a traditional handwoven silk saree from Maharashtra."
    },
    {
        q: "Which Punjabi word means 'the beloved'?",
        opts: ["Sohni", "Heer", "Mahi", "All of these"],
        ans: 3,
        fact: "Sohni, Heer, and Mahi are all poetic terms for the beloved."
    },
    {
        q: "Which Maharashtrian dish is a stuffed bread made with lentils?",
        opts: ["Puran Poli", "Bhakri", "Thalipeeth", "Karanji"],
        ans: 0,
        fact: "Puran Poli is a sweet flatbread stuffed with a lentil and jaggery filling."
    },
    {
        q: "Which state celebrates 'Gudi Padwa' as the New Year?",
        opts: ["Maharashtra", "Punjab", "Karnataka", "Tamil Nadu"],
        ans: 0,
        fact: "Gudi Padwa is the Maharashtrian New Year, celebrated with great enthusiasm."
    },
    {
        q: "Which Punjabi dish is a thick yoghurt-based drink?",
        opts: ["Lassi", "Chhach", "Kheer", "Raita"],
        ans: 0,
        fact: "Lassi is a traditional Punjabi drink made from churned yoghurt."
    },
    {
        q: "Which Maharashtrian festival is known for its beautiful 'rangoli' designs?",
        opts: ["Diwali", "Gudi Padwa", "Makar Sankranti", "All of these"],
        ans: 3,
        fact: "Rangoli is an integral part of all major festivals in Maharashtra."
    },
    {
        q: "Which state is known for its 'Bhakri' and 'Puran Poli'?",
        opts: ["Maharashtra", "Punjab", "Rajasthan", "Gujarat"],
        ans: 0,
        fact: "Bhakri and Puran Poli are traditional Maharashtrian dishes."
    }
];


async function seed() {
    console.log('🌱 Starting question seeding...');
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📡 Connected to MongoDB');

        // Check if any questions already exist (optional – we still skip duplicates)
        const existingCount = await Question.countDocuments();
        if (existingCount > 0) {
            console.log(`📚 ${existingCount} questions already exist. No new questions will be added (duplicates will be skipped).`);
        }

        let added = 0;
        for (let i = 0; i < allQuestions.length; i++) {
            const q = allQuestions[i];
            // Avoid inserting the same question text
            const exists = await Question.findOne({ q: q.q });
            if (!exists) {
                await Question.create({
                    ...q,
                    id: i + 1   // assign ID based on position (or use a counter)
                });
                added++;
            }
        }

        console.log(`✅ Seeding complete. ${added} new questions added.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    }
}

seed();