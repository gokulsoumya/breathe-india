import ky from 'ky';
import Ajv from 'ajv/dist/jtd';
const ajv = new Ajv();

let BASE_URL = "/api"

const parseLoginResponse = ajv.compileParser({
  properties: {
    our_token: { type: "string" },
    userid: { type: "string" }
  },
});

async function login({ token }) {
  return await ky.post(BASE_URL + "/login", {
    json: {
      token
    },
    parseJson: (text) => {
      let data = parseLoginResponse(text);
      if (data === undefined) {
        throw { message: parseLoginResponse.message, position: parseLoginResponse.position };
      }
      return data;
    }
  }).json()
}

const profileSchema = {
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    email: { type: "string" },
    profile_pic_url: { type: "string" },
    bio: { type: "string" },
    verified: { type: "boolean" },
    admin: { type: "boolean" },

  },
};
const parseProfileResponse = ajv.compileParser(profileSchema);

async function profile({ token }) {
  return await ky.get(BASE_URL + "/profile", {
    headers: {
      "Authorization": "Bearer " + token
    },
    parseJson: (text) => {
      const parse = parseProfileResponse;
      let data = parse(text);
      if (data === undefined) {
        throw { message: parse.message, position: parse.position };
      }
      return data;
    }
  }).json()
}

async function profileUpdate({ bio, token }) {
  return await ky.post(BASE_URL + "/profile", {
    headers: {
      "Authorization": "Bearer " + token,
    },
    json: {
      bio
    },
    parseJson: (text) => {
      const parse = parseProfileResponse;
      let data = parse(text);
      if (data === undefined) {
        throw { message: parse.message, position: parse.position };
      }
      return data;
    }
  }).json()
}

const publicProfileSchema = {
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    profile_pic_url: { type: "string" },
    bio: { type: "string" },
    verified: { type: "boolean" },
  }
};

const postSchema = {
  properties: {
    id: { type: "string" },
    userid: { type: "string" },
    post_type: { enum: ["Needs", "Supplies"] },
    state: { type: "string" },
    district: { type: "string" },
    city: { type: "string" },
    spot: { type: "string" },
    created_at: { type: "timestamp" },
    updated_at: { type: "timestamp" },
    message: { type: "string" },
    item: { type: "string" },
    quantity: { type: "string" },
  },
}
const getPostsSchema = {
  elements: { ref: "Post" },
  definitions: {
    "Post": postSchema,
    "User": publicProfileSchema,
  }
}
const parseGetPostsResponse = ajv.compileParser(getPostsSchema)

async function getPosts({ start = null, n = null, typ, location = null, item = null }) {
  let searchParams = {};
  if (start) {
    searchParams.start = start;
  }
  if (n) {
    searchParams.n = n;
  }
  if (typ) {
    searchParams.typ = typ;
  }
  if (location) {
    searchParams.location = location;
  }
  if (item) {
    searchParams.item = item;
  }
  return await ky.get(BASE_URL + "/posts", {
    // @ts-ignore
    searchParams,
    parseJson: (text) => {
      const parse = parseGetPostsResponse;
      let data = parse(text);
      if (data === undefined) {
        throw { message: parse.message, position: parse.position };
      }
      return data;
    }
  }).json()
}
const getPostSingleSchema = {
  properties: {
    post: { ref: "Post" },
    user: { ref: "User", nullable: true },
  },
  definitions: {
    "Post": postSchema,
    "User": publicProfileSchema,
  }
}
const parseGetPostSingleResponse = ajv.compileParser(getPostSingleSchema);
async function getPostSingle({ id }) {
  return await ky.get(BASE_URL + "/posts/" + id, {
    parseJson: (text) => {
      const parse = parseGetPostSingleResponse;
      let data = parse(text);
      if (data === undefined) {
        throw { message: parse.message, position: parse.position };
      }
      return data;
    }
  }).json()
}

const getMyPostsSchema = {
  elements: { ref: "Post" },
  definitions: {
    "Post": postSchema,
  }
};
const parseGetMyPostsResponse = ajv.compileParser(getMyPostsSchema)

async function getMyPosts({ token }) {
  return await ky.get(BASE_URL + "/my_posts", {
    headers: {
      "Authorization": "Bearer " + token,
    },
    parseJson: (text) => {
      const parse = parseGetMyPostsResponse;
      let data = parse(text);
      if (data === undefined) {
        throw { message: parse.message, position: parse.position };
      }
      return data;
    }
  }).json()
}

const parseCreatePostResponse = ajv.compileParser(postSchema);

async function createPost({ post_type, state, district, city, spot, message, item, quantity, token }) {


  return await ky.post(BASE_URL + "/posts", {
    headers: {
      "Authorization": "Bearer " + token,
    },
    json: {
      post_type,
      state,
      district,
      city,
      spot,
      message,
      item,
      quantity,
    },
    parseJson: (text) => {
      const parse = parseCreatePostResponse;
      let data = parse(text);
      if (data === undefined) {
        throw { message: parse.message, position: parse.position };
      }
      return data;
    }
  }).json()
}

async function updatePost({ id, post_type, state, district, city, spot, message, item, quantity, token }) {

  return await ky.patch(BASE_URL + "/posts/" + id, {
    headers: {
      "Authorization": "Bearer " + token,
    },
    json: {
      post_type,
      state,
      district,
      city,
      spot,
      message,
      item,
      quantity
    },
    parseJson: (text) => {
      const parse = parseCreatePostResponse;
      let data = parse(text);
      if (data === undefined) {
        throw { message: parse.message, position: parse.position };
      }
      return data;
    }
  }).json()
}


async function deletePost({ id, token }) {
  return await ky.delete(BASE_URL + "/posts/" + id, {
    headers: {
      "Authorization": "Bearer " + token,
    },
  })
}

export default { login, profile, profileUpdate, getPosts, getPostSingle, getMyPosts, createPost, updatePost, deletePost };
