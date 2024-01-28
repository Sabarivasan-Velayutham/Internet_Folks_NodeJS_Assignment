const { Member } = require("./member.model");
const { Role } = require("../role/role.model");
const { Community } = require("../community/community.model");
const { hasRole } = require("./member.service");

async function addMember(req, res) {
  try {
    const { community, user, role } = req.body;

    // Check if the community exists
    const existingCommunity = await Community.findById(community);
    if (!existingCommunity) {
      return res.status(404).json({
        status: false,
        errors: [
          {
            param: "community",
            message: "Community not found.",
            code: "RESOURCE_NOT_FOUND",
          },
        ],
      });
    }

    // Check if the role exists
    const existingRole = await Role.findById(role);
    if (!existingRole) {
      return res.status(404).json({
        status: false,
        errors: [
          {
            param: "role",
            message: "Role not found.",
            code: "RESOURCE_NOT_FOUND",
          },
        ],
      });
    }

    const adminRole = await Role.findOne({ name: "Community Admin" });
    const moderatorRole = await Role.findOne({ name: "Community Moderator" });

    // Check if the user has the required permissions
    if (
      !(await hasRole(community, req.user.toObject()._id, adminRole)) &&
      !(await hasRole(community, req.user.toObject()._id, moderatorRole))
    ) {
      return res.status(403).json({
        status: false,
        errors: [
          {
            message: "You are not authorized to perform this action.",
            code: "NOT_ALLOWED_ACCESS",
          },
        ],
      });
    }

    // Check if the user is already a member of the community
    const existingMember = await Member.findOne({ community, user });
    if (existingMember) {
      return res.status(400).json({
        status: false,
        errors: [
          {
            message: "User is already added in the community.",
            code: "RESOURCE_EXISTS",
          },
        ],
      });
    }

    // Create a new member
    const newMember = await Member.create({
      community,
      user,
      role: role,
    });

    res.status(201).json({
      status: true,
      content: {
        data: {
          id: newMember._id,
          community: newMember.community,
          user: newMember.user,
          role: newMember.role,
          created_at: newMember.created_at,
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
          code: "INTERNAL_SERVER_ERROR",
        },
      ],
    });
  }
}

async function deleteMember(req, res) {
  try {
    const moderatorRole = await Role.findOne({ name: "Community Moderator" });
    const adminRole = await Role.findOne({ name: "Community Admin" });

    const communityMember = await Member.findById(req.params.id)
      .populate("community")
      .populate("role");

    if (!communityMember) {
      return res.status(404).json({
        status: false,
        errors: [
          {
            message: "Member not found.",
            code: "RESOURCE_NOT_FOUND",
          },
        ],
      });
    }

    if (
      !(await hasRole(
        communityMember.community._id,
        req.user.toObject()._id,
        adminRole
      )) &&
      !(await hasRole(
        communityMember.community._id,
        req.user.toObject()._id,
        moderatorRole
      ))
    ) {
      return res.status(403).json({
        status: false,
        errors: [
          {
            message: "Not allowed access.",
            code: "NOT_ALLOWED_ACCESS",
          },
        ],
      });
    }

    await Member.findByIdAndRemove(req.params.id);

    return res.json({ status: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      errors: [
        {
          message: "Server Error.",
          code: "INTERNAL_SERVER_ERROR",
        },
      ],
    });
  }
}

module.exports = { addMember, deleteMember };
