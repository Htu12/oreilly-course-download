const { formatHeader, formatBody, saveJson } = require("./helpers");

const COURSE_CONFIG = {
  ID: "",
  PATH: "",
  OUTPUT_FILE: "",
};

/**
 * Class thương tác với O'Reilly API và tải thông tin video
 */
class Agent {
  /**
   *
   * @private
   */
  #API_CONFIG = {
    BASE_API: "https://learning.oreilly.com/api/v1",
    BASE_URL: "https://learning.oreilly.com",
    CDN_URL: "https://cdnapisec.kaltura.com/api_v3/service/multirequest",
  };

  constructor(courseId, coursePath, options = {}) {
    this._courseId = courseId;
    this._coursePath = coursePath;
    this._baseApiUrl = this.#API_CONFIG.BASE_API;
    this._baseUrl = this.#API_CONFIG.BASE_URL;
    this._cdnUrl = this.#API_CONFIG.CDN_URL;

    //Cache
    this._cache = {
      kalturaIds: new Map(),
      sessionKeys: new Map(),
    };

    this._concurrency = options.concurrency || 8;
  }

  /**
   * Lấy danh sách mục lục (Table of Contents) của khóa học.
   * @returns {Promise<Array>} Danh sách các chương và video.
   */
  async getVideoTocs() {
    try {
      const res = await fetch(
        `${this._baseApiUrl}/videotocs/${this._courseId}`,
        {
          method: "GET",
          headers: formatHeader(`${this._baseUrl}/course/${this._coursePath}/`),
        }
      );

      if (!res.ok) throw new Error(`HTTP Error videotocs: ${res.status}`);

      const data = await res.json();
      return data.toc;
    } catch (error) {
      throw new Error(`getVideoTocs failed: ${error.message}`);
    }
  }

  /**
   * Lấy ID hệ thống Kaltura từ reference ID của bài học.
   * @param {string} referenceId - ID tham chiếu của bài học.
   * @returns {Promise<string>} Kaltura Entry ID.
   */
  async getKalturaEntryId(referenceId) {
    if (this._cache.kalturaIds.has(referenceId))
      return this._cache.kalturaIds.get(sp);

    try {
      const res = await fetch(
        `${this._baseApiUrl}/videoclips/${referenceId}/`,
        {
          method: "GET",
          headers: formatHeader(
            `${this._baseUrl}/video/${this._coursePath}/${this._courseId}/${referenceId}/`
          ),
        }
      );

      if (!res.ok)
        throw new Error(`HTTP Error videoclips(${referenceId}): ${res.status}`);

      const data = await res.json();
      this._cache.kalturaIds.set(referenceId, data.kaltura_entry_id);

      return data.kaltura_entry_id;
    } catch (error) {
      throw new Error(`getKalturaEntryId(${sp}) failed: ${error.message}`);
    }
  }

  /**
   * Lấy Session Key để được quyền truy cập video.
   * @param {string} referenceId
   * @returns {Promise<string>} Session Key
   */
  async getSessionKey(referenceId) {
    if (this._cache.sessionKeys.has(referenceId))
      return this._cache.sessionKeys.get(referenceId);

    try {
      const res = await fetch(`${this._baseApiUrl}/player/kaltura_session/`, {
        method: "GET",
        headers: formatHeader(
          `${this._baseUrl}/video/${this._coursePath}/${this._courseId}/${referenceId}/`
        ),
      });

      if (!res.ok)
        throw new Error(`HTTP Error session(${referenceId}): ${res.status}`);

      const data = await res.json();
      this._cache.sessionKeys.set(referenceId, data.session);

      return data.session;
    } catch (error) {
      throw new Error(`getSessionKey(${referenceId}) failed: ${error.message}`);
    }
  }

  /**
   * Lấy link tải video (MP4) và phụ đề (VTT).
   * @param {string} kalturaEntryId
   * @param {string} referenceId
   * @returns {Object} Link video và phụ đề
   */
  async getDownloadAndCaption(kalturaEntryId, referenceId) {
    const sessionKey = await this.getSessionKey(referenceId);

    try {
      const res = await fetch(this._cdnUrl, {
        method: "POST",
        headers: {
          ...formatHeader(`${this._baseUrl}/`),
          "Content-Type": "application/json",
        },
        body: formatBody({ kei: kalturaEntryId, ssk: sessionKey }),
      });

      if (!res.ok) throw new Error(`HTTP CDN multirequest: ${res.status}`);

      const data = await res.json();
      const downloadUrl = data?.[0]?.objects?.[0]?.downloadUrl || null;
      const captionEn = data?.[1]?.playbackCaptions?.[0]?.url || null;

      return { downloadUrl, captionEn };
    } catch (error) {
      throw new Error(
        `getDownloadAndCaption(${referenceId}) failed: ${error.message}`
      );
    }
  }

  /**
   * Xử lý danh sách bài học: Gom nhóm theo chương và lấy link tải song song
   * @param {Array} tocData
   * @param {Number} onProgress
   * @returns {Object}
   */
  async groupChapters(tocData, onProgress) {
    const chapters = [];
    let current = null;
    const clipItems = [];

    for (const item of tocData) {
      if (item.depth === 1) {
        current = { chapterTitle: item.title, items: [] };
        chapters.push(current);
      } else if (item.depth === 2 && current) {
        clipItems.push({ chapter: current, ref: item.reference_id });
      }
    }

    // Batch processing with limited concurrency
    const results = [];
    let index = 0;

    const worker = async (clip) => {
      try {
        const kalturaId = await this.getKalturaEntryId(clip.ref);
        const video = await this.getDownloadAndCaption(kalturaId, clip.ref);

        clip.chapter.items.push({
          reference_id: clip.ref,
          kaltura_entry_id: kalturaId,
          video,
        });

        results.push({ ref: clip.ref, ok: true });
      } catch (e) {
        results.push({ ref: clip.ref, ok: false, error: e.message });
      } finally {
        index++;
        if (onProgress) onProgress(index, clipItems.length);
      }
    };

    const pool = [];
    for (const clip of clipItems) {
      const p = worker(clip);
      pool.push(p);
      if (pool.length >= this._concurrency) {
        await Promise.race(pool).catch(() => {});
        // Remove settled promises
        for (let i = pool.length - 1; i >= 0; i--) {
          if (pool[i].settled) pool.splice(i, 1);
        }
      }
    }

    await Promise.allSettled(pool);

    await saveJson(chapters, COURSE_CONFIG.OUTPUT_FILE);
    return { chapters, results };
  }
}

//MAIN///
async function main() {
  try {
    const agent = new Agent(COURSE_CONFIG.ID, COURSE_CONFIG.PATH, {
      concurrency: 5,
    });
    const toc = await agent.getVideoTocs();
    const { chapters, results } = await agent.groupChapters(
      toc,
      (done, total) => {
        console.log(`Progress: ${done}/${total}`);
      }
    );

    console.log("Chapters:", chapters.length);
    console.log("Failed clips:", results.filter((r) => !r.ok).length);
  } catch (e) {
    console.error("Fatal:", e.message);
  }
}

main();
