const { Role } = require("../role/role.model");
const { Community } = require("./community.model");
const { Member } = require("../member/member.model");

let Validator = require("validatorjs");

async function createCommunity(req, res) {
  try {
    const { name } = req.body;

    // Validate name length
    const validationRules = {
      name: "required|min:2",
    };
    const validation = new Validator({ name }, validationRules);
    if (validation.fails()) {
      return res.status(400).json({
        status: false,
        errors: [
          {
            param: "name",
            message: "Name should be at least 2 characters.",
            code: "INVALID_INPUT",
          },
        ],
      });
    }

    // Check if the community already exists
    const existingCommunity = await Community.findOne({ name });
    if (existingCommunity) {
      return res.status(409).json({
        status: false,
        errors: [
          {
            param: "name",
            message: "Community with this name already exists.",
            code: "RESOURCE_EXISTS",
          },
        ],
      });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/\s+/g, "-");
    const ownerId = req.user._id;

    const community = await Community.create({
      name,
      slug,
      owner: ownerId,
    });

    const adminRole = await Role.findOne({ name: "Community Admin" });
    const member = await Member.create({
      community: community._id,
      user: ownerId,
      role: adminRole._id,
    });

    res.status(201).json({
      status: true,
      content: {
        data: {
          id: community._id,
          name: community.name,
          slug: community.slug,
          owner: community.owner,
          created_at: community.created_at,
          updated_at: community.updated_at,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      errors: [
        {
          message: "Server Error",
          code: "SERVER_ERROR",
        },
      ],
    });
  }
}

async function getAllCommunities(req, res) {
  const page = Number(req.query.page) || 1;
  const perPage = 10;
  const skip = perPage * (page - 1);

  const [communities, total] = await Promise.all([
    Community.find().populate("owner", "id name").skip(skip).limit(perPage),
    Community.countDocuments(),
  ]);

  const totalPages = Math.ceil(total / perPage);

  res.json({
    status: true,
    content: {
      meta: {
        total,
        pages: totalPages,
        page,
      },
      data: communities,
    },
  });
}

async function getAllMembers(req, res) {
  try {
    const perPage = 10;
    const page = parseInt(req.query.page) || 1;
    const communityId = req.params.id;

    const totalCount = await Member.countDocuments({ community: communityId });
    const totalPages = Math.ceil(totalCount / perPage);
    const members = await Member.find({ community: communityId })
      .skip(perPage * page - perPage)
      .limit(perPage)
      .populate("user", "id name")
      .populate("role")
      .lean();

    res.status(200).json({
      status: true,
      content: {
        meta: {
          total: totalCount,
          pages: totalPages,
          page: page,
        },
        data: members,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
}

async function getMyOwnedCommunity(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    const userId = req.user.toObject()._id;
    const count = await Community.countDocuments({ owner: userId });
    const communities = await Community.find({ owner: userId })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(count / limit);
    const meta = {
      total: count,
      pages: totalPages,
      page: page,
    };

    res.status(200).json({
      status: true,
      content: {
        meta,
        data: communities.map((community) => ({
          id: community._id,
          name: community.name,
          slug: community.slug,
          owner: community.owner._id, 
          created_at: community.created_at,
          updated_at: community.updated_at,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      errors: [
        {
          message: "Server Error",
          code: "SERVER_ERROR",
        },
      ],
    });
  }
}

async function getMyJoinedCommunity(req, res) {
  const { page = 1, limit = 10 } = req.query;
  const userId = req.user._id;

  try {
    const members = await Member.find({ user: userId })
      .populate({
        path: "community",
        select: "_id name slug owner created_at updated_at",
        populate: {
          path: "owner",
          select: "_id name",
        },
      })
      .lean()
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .exec();

    const total = await Member.countDocuments({ user: userId });
    const pages = Math.ceil(total / limit);

    const transformedData = members.map((member) => ({
      id: member.community._id,
      name: member.community.name,
      slug: member.community.slug,
      owner: {
        id: member.community.owner._id,
        name: member.community.owner.name,
      },
      created_at: member.community.created_at,
      updated_at: member.community.updated_at,
    }));

    res.status(200).json({
      status: true,
      content: {
        data: transformedData,
        meta: {
          total,
          pages,
          page: parseInt(page),
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  createCommunity,
  getAllCommunities,
  getAllMembers,
  getMyOwnedCommunity,
  getMyJoinedCommunity,
};
