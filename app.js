const express = require('express')
const app = express()

require('dotenv').config()
const ejs = require('ejs');
app.set('view engine', 'ejs');
const mongoose = require('mongoose')
app.use(express.urlencoded({ extended: true }));
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));


mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err));

const userSchema = new mongoose.Schema({
  name: String,
  fname: String,
  dob: String,
  doa: String,
  mobile: String,
  email: String,
  address: String,
  course: String

});

const User = mongoose.model('User', userSchema);



const feeSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  fromDate: {
    type: Date,
    required: true
  },
  toDate: {
    type: Date,
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  mobileNumber: {
    type: String,
    required: true
  },
});



const Fee = mongoose.model('Fee', feeSchema);

app.get('/', function (req, res) {
  res.render('add')
});

app.post('/form', async function (req, res) {

  const newUser = new User({
    name: req.body.name,
    fname: req.body.fname,
    dob: req.body.dob,
    doa: req.body.doa,
    mobile: req.body.mobile,
    email: req.body.email,
    address: req.body.address,
    course: req.body.course

  });

  // Save the new user document to MongoDB
  await newUser.save()
  res.redirect('/');
});




app.get('/search', async (req, res) => {
  try {
    const searchQuery = req.query.q || '';
    console.log(`searchQuery: ${searchQuery}`);

    let users = [];

    if (searchQuery) {
      console.log(`Performing search for: ${searchQuery}`);
      users = await User.find({ name: new RegExp(searchQuery, 'i') });
      console.log(`Found ${users.length} results`);
    }

    res.render('search', { users, searchQuery });
  } catch (error) {
    console.log(error);
    res.status(500).send('Server Error');
  }
});



// GET route to render the fees page
app.get('/fees', function (req, res) {
  const user = {
    name: req.query.name,
    fname: req.query.fname,
    mobile: req.query.mobile,
  };
  const studentId = req.query.studentId;
  res.render('fees', { user: user, studentId: studentId });
});


// POST route to add a new fee record
app.post('/fees', async (req, res) => {
  try {
    console.log(req.body);
    const fee = new Fee({
      amount: req.body.amount,
      fromDate: req.body.fromDate,
      toDate: req.body.toDate,
      student: req.body.studentId,
      username: req.body.username,
      mobileNumber: req.body.mobileNumber
    });
    await fee.validate(); // validate the fee object before saving
    await fee.save();
    res.redirect('/home');
  } catch (err) {
    // handle the validation error
    if (err.name === 'ValidationError') {
      const errors = err.errors;
      const errorMessages = Object.values(errors).map(e => e.message);
      res.status(400).render('fees', { errors: errorMessages });
    } else {
      // handle other errors
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  }
});

// GET route to display all the fees data
app.get('/home', async (req, res) => {
  try {
    // Query the database to get all the fees data along with the student details
    const fees = await Fee.find().sort({ createdAt: 'desc' });
    console.log(fees);
    res.render('home', { fees });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/deleteFee', async (req, res) => {
  try {
    // Delete the fee data from the database
    const feeId = req.body.feeId;
    await Fee.findByIdAndDelete(feeId);

    // Redirect to the home page after successful deletion
    res.redirect('/home');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


app.post('/lastpayment', async function (req, res) {
  const mobile = req.body.mobileNumber;
  console.log(mobile);

  try {
    const fees = await Fee.find({ mobileNumber: mobile });
    console.log(fees)
    if (fees.length > 0) {
      res.render('lastpayment', { fees: fees });
    } else {
      res.render('notfound', { message: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    res.render('notfound', { message: 'Something went wrong' });
  }
});


app.get('/test', async function (req, res) {
  try {
    const users = await User.find();
    res.render('test', { users });
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Something went wrong' });
  }
});

app.get('/test/:id/delete', async function (req, res) {
  try {
    const id = req.params.id;
    await User.findByIdAndDelete(id);
    res.redirect('/test');
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Something went wrong' });
  }
});

app.get('/test/:id/edit', async function (req, res) {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    res.render('edit', { user });
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Something went wrong' });
  }
});
app.post('/test/:id/edit', async function (req, res) {
  try {
    const id = req.params.id;
    const { name, email, address } = req.body;
    const user = await User.findByIdAndUpdate(id, { name, email, address });
    res.redirect('/test');
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Something went wrong' });
  }
});



app.get('/dashboard', async function (req, res) {
  try {
    const fees = await Fee.find();
    const users = await User.find();
    const today = new Date();
    const data = users.map(user => {
      const fee = fees.find(fee => fee.mobileNumber === user.mobile);
      if (fee) {
        const lastPaymentDate = new Date(fee.toDate);
        const daysSinceLastPayment = Math.floor((today - lastPaymentDate) / (1000 * 60 * 60 * 24));
        const daysUntilLastPayment = Math.floor((lastPaymentDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntilLastPayment < 1) {
          const formattedDate = `${lastPaymentDate.getDate()}/${lastPaymentDate.getMonth() + 1}/${lastPaymentDate.getFullYear()}`;
          return { name: user.name !== undefined ? user.name : "", daysSinceLastPayment: daysSinceLastPayment, lastPaidDate: lastPaymentDate, quote: "Fees Dedo Time Ho Gya" };
        } else {
          const nextPaymentDate = new Date(lastPaymentDate.getTime() + fee.interval * 24 * 60 * 60 * 1000);
          const daysUntilNextPayment = Math.floor((nextPaymentDate - today) / (1000 * 60 * 60 * 24));
          const paidTillDate = daysUntilLastPayment <= 0 ? `${lastPaymentDate.getDate()}/${lastPaymentDate.getMonth() + 1}/${lastPaymentDate.getFullYear()}` : '';
          return { name: user.name !== undefined ? user.name : "", daysSinceLastPayment, lastPaidDate: lastPaymentDate, daysUntilNextPayment, paidTillDate, quote: daysSinceLastPayment < 0 ? "Keep It Up" : "Fees Dedo Time Ho Gya" };
        }
      } else {
        return { name: user.name !== undefined ? user.name : "", daysSinceLastPayment: '-', lastPaidDate: null, daysUntilNextPayment: null, paidTillDate: '', quote: '' };
      }
    });
    // sort data array in descending order of daysSinceLastPayment
    data.sort((a, b) => b.daysSinceLastPayment - a.daysSinceLastPayment);

    // add position property to each object
    data.forEach((item, index) => {
      item.position = index + 1;
    });

    res.render('dashboard', { data });
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Something went wrong' });
  }
});




app.listen(3000, function () {
  console.log("server is listening on localhost:3000")
});
