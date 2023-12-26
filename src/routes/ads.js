const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Ads = require('../models/ads');
const { transporter } = require('../config/config');



router.post('/ads-details', async (req, res) => {
    const name= req.body.name
    const email = req.body.email

    const adsEmail = await Ads.findOne({ email });

    if (adsEmail) {
        res.status(400).json({ error: 'Email already subscribe. Thanks' });
        return;
    }
    // Email content
    const mailOptions = {
        from: 'no-reply@sovereigntechltd.com',
        to: email,
        subject: 'FoodBankApp Ads Subscription',
        html: `
            <main>
                <div style="background-color: #f4f4f4; text-align: center; width: 100%;">
                    <img style="width: 70px; padding: 15px;" src="https://sovereigntechltd.com/Frame%2028%20_1_.png" alt="logo">
                </div>
                
                <h2>Hello ${name},</h2>
                <p>Welcome Aboard: Your Journey With Foodbank Starts Here!</p>
                <p>
                We're thrilled to have you onboard! You've just unlocked a new world filled with exciting products, 
                exclusive deals, and an enriching experience that is tailored just for you.
                </p>
                <p>If you didn't attempt to register, please contact us at info@sovereigntechltd.com.</p>
                <p>©️ 2023 Sovereigntechltd. All rights reserved.</p>
            </main>
        `,
    };

    try {
        // Send the email
        await transporter.sendMail(mailOptions);
        const newAds = new Ads({
            name: req.body.name,
            email: req.body.email,
            companyName:req.body.companyName
        });


        if (!newAds) {
            return res.status(400).json({ error: 'Error creating the ads' });
        }
        await newAds.save();

        res.status(200).json({ message: 'Ads created successfully' });

    } catch (error) {
        res.status(500).json({ error: `Failed to create ads!!!`});
    }
})


module.exports = router;