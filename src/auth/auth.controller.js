const { User } = require("./auth.model");
let Validator = require("validatorjs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

async function signUp(req, res) {
  const { name, email, password } = req.body;

  const rules = {
    name: "required|min:2",
    email: "required|email",
    password: "required|min:6",
  };
  const validation = new Validator(req.body, rules);
  if (validation.fails()) {
    const errors = validation.errors.all();
    const formattedErrors = Object.keys(errors).map((param) => ({
      param,
      message: errors[param][0],
      code: "INVALID_INPUT",
    }));

    return res.status(400).json({
      status: false,
      errors: formattedErrors,
    });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      status: false,
      errors: [
        {
          param: "email",
          message: "User with this email address already exists.",
          code: "RESOURCE_EXISTS",
        },
      ],
    });
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const user = new User({
    name,
    email,
    password: hashedPassword,
  });
  await user.save();

  const accessToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.status(201).json({
    status: true,
    content: {
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
      meta: {
        access_token: accessToken,
      },
    },
  });
}

async function signIn(req, res) {
  const { email, password } = req.body;

  // Check if the email contains "@" symbol
  if (!email.includes("@")) {
    return res.status(401).json({
      status: false,
      errors: [
        {
          param: "email",
          message: "Please provide a valid email address.",
          code: "INVALID_INPUT",
        },
      ],
    });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({
      status: false,
      errors: [
        {
          param: "email",
          message: "The credentials you provided are invalid.",
          code: "INVALID_INPUT",
        },
      ],
    });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    return res.status(401).json({
      status: false,
      errors: [
        {
          param: "password",
          message: "The credentials you provided are invalid.",
          code: "INVALID_CREDENTIALS",
        },
      ],
    });
  }

  const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

  res.json({
    status: true,
    content: {
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
      meta: {
        access_token: accessToken,
      },
    },
  });
}

async function getMe(req, res) {
  const user = req.user.toObject();
  delete user.password;

  res.status(201).json({
    status: true,
    content: {
      data: user,
    },
  });
}

module.exports = { signUp, signIn, getMe };
