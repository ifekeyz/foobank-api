const { User } = require('../models/user');
const Driver = require('../models/driver');
const bcrypt = require('bcrypt');
const Order = require('../models/order')
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { transporter } = require('../config/config');




const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const driverExists = await Driver.findOne({ email })
    if (driverExists) {
      return res.status(500).json({ message: "Opps! Provided email already exist use another email address" })
    }

    const hashedPassword = bcrypt.hashSync(password, 10)

    const driver = new Driver({
      fullName: fullName,
      email: email,
      password: hashedPassword,
    });

    await driver.save();

    res.status(200).json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Error creating driver', error: error.message });
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const driver = await Driver.findOne({ email });

    if (!driver) {
      res.status(400).json({ message: "driver not found" });
    }

    if (driver && bcrypt.compareSync(password, driver.password)) {
      const secret = process.env.secret;
      const token = jwt.sign(
        {
          driverId: driver.id,
        },
        secret,
        { expiresIn: '1d' }
      )
      res.status(200).send({ driver: driver.email, token: token, id: driver._id })
    }
    else {
      res.status(400).send('Opps! Password is wrong')
    }

  } catch (error) {
    res.status(500).json({ message: 'Error on login', error: error.message });
  }
};

const deliveryPickup = async (req, res) => {
  try {
    const { orderId, id, } = req.body;

    const userExists = await User.findById(id)
    if (!userExists) {
      return res.status(500).json({ message: "Opps! User does not exist" })
    }
    const userEmail = userExists.email

    const order = await Order.findById(orderId)

    const otp = await generateOtp()

    //Send otp to user mail

    // Email content
    const mailOptions = {
      from: 'no-reply@sovereigntechltd.com',
      to: userEmail,
      subject: 'Order OTP-Request',
      text: `Your verification code for FoodBank Order is : ${otp}`,
    };

    await transporter.sendMail(mailOptions);
    order.deliveryOtp = otp

    await order.save()

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error creating driver', error: error.message });
  }
}

const deliveryDropoff = async (req, res) => {
  try {
    const { otp, orderId } = req.body;

    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(500).json({ message: "Opps! Order does not exist" })
    }

    if (otp == order.deliveryOtp) {
      order.status = "delivered"
      await order.save()
    } else {
      return res.status(500).json({ message: "Opps! Otp does not match" })
    }
    const currentDate = new Date();

    const options = { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
    const formattedDate = currentDate.toLocaleDateString('en-US', options);



    res.status(200).json({order,formattedDate});
  } catch (error) {
    res.status(500).json({ message: 'Error creating driver', error: error.message });
  }
};

const getApprovedOrders = async (req, res) => {
  try {
    // Find all orders with status 'approved'
    const approvedOrders = await Order.find({ status: 'approved' })

    res.status(200).json(approvedOrders);
  } catch (error) {
    console.error('Error fetching approved orders:', error);
    res.status(500).json({ error: 'Failed to fetch approved orders' });
  }
};


const getDeliveryHistory = async (req, res) => {
  try {
    // Find all orders with status 'approved'
    const deliveredOrders = await Order.find({ status: 'delivered' })

    res.status(200).json(deliveredOrders);
  } catch (error) {
    console.error('Error fetching delivered orders:', error);
    res.status(500).json({ error: 'Failed to fetch delivered orders' });
  }
};

const generateOtp = async () => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < 4; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};



module.exports = {
  register,
  login,
  deliveryPickup,
  deliveryDropoff,
  getApprovedOrders,
  getDeliveryHistory,
};