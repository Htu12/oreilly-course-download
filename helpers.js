const fs = require("fs");
const cookieFilePath = "cookies.txt";
const cookies = fs.readFileSync(cookieFilePath, "utf-8").trim();

//format cookies for fetch header//
const FORMAT_COOKIES = cookies
  .split("\n")
  .map((line) => line.split("\t"))
  .map((parts) => `${parts[5]}=${parts[6]}`)
  .join("; ");

function saveJson(data, path) {
  if (fs.existsSync(path)) {
    console.log("Đã tồn tại files");
    return;
  }

  fs.writeFileSync(path, JSON.stringify(data), (err) => {
    throw new Error("Lỗi lưu đường dẫn", err);
  });
}

function readJson(path) {
  if (!fs.existsSync(path)) {
    console.log("Không tồn tại file: ", path);
    return null;
  }

  try {
    const data = fs.readFileSync(path, "utf8");

    return JSON.parse(data);
  } catch (err) {
    console.error("Lỗi khi đọc hoặc parse file:", err);
    return null;
  }
}

function formatBody(obj) {
  const { ssk, kei } = obj;

  return `{"1":{"service":"baseEntry","action":"list","ks":"${ssk}","filter":{"redirectFromEntryId":"${kei}"},"responseProfile":{"type":1,"fields":"id,referenceId,name,description,thumbnailUrl,dataUrl,duration,msDuration,flavorParamsIds,mediaType,type,tags,dvrStatus,externalSourceType,status,createdAt,updatedAt,endDate,plays,views,downloadUrl,creatorId,rootEntryId,capabilities,adminTags"}},"2":{"service":"baseEntry","action":"getPlaybackContext","entryId":"{1:result:objects:0:id}","ks":"${ssk}","contextDataParams":{"objectType":"KalturaContextDataParams","flavorTags":"all"}},"3":{"service":"metadata_metadata","action":"list","filter":{"objectType":"KalturaMetadataFilter","objectIdEqual":"{1:result:objects:0:id}","metadataObjectTypeEqual":"1"},"ks":"${ssk}"},"apiVersion":"3.3.0","format":1,"ks":"${ssk}","clientTag":"html5:v3.17.61","partnerId":"1926081"}`;

}

function formatHeader(refer) {
  const HEADERS = {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9,vi;q=0.8",
    "sec-ch-ua":
      '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    cookie: FORMAT_COOKIES,
    Refer: refer,
  };

  return HEADERS;
}


module.exports = {
  formatHeader,
  formatBody,
  saveJson,
  readJson,
};
