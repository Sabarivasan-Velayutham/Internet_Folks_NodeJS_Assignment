const { Role } = require("./role.model");
let Validator = require("validatorjs");

async function createRole(req, res) {
  const { name } = req.body;

  const rules = {
    name: "required|min:2",
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

  const role = new Role({
    name,
  });
  await role.save();

  res.status(201).json({
    status: true,
    content: {
      data: {
        id: role._id,
        name: role.name,
        created_at: role.created_at,
        updated_at: role.updated_at,
      },
    },
  });
}

async function getAllRole(req, res) {
  const { page = 1, limit = 10 } = req.query;

  const total = await Role.countDocuments();

  const pages = Math.ceil(total / limit);
  const currentPage = parseInt(page);

  const roles = await Role.find()
    .skip((currentPage - 1) * limit)
    .limit(parseInt(limit));

  const formattedRoles = roles.map((role) => ({
    id: role._id,
    name: role.name,
    created_at: role.created_at,
    updated_at: role.updated_at,
  }));

  res.json({
    status: true,
    content: {
      meta: {
        total,
        pages,
        page: currentPage,
      },
      data: formattedRoles,
    },
  });
}

module.exports = { createRole, getAllRole };
