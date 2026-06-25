(async () => {
  const config = {
    batchSize: 3,
    batchDelay: 500,
    fetchPageDelay: 300,
    pageSize: 50,
    pauseOnRisk: true
  };

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  window.__stopBiliUnfollow = false;

  function getCsrfToken() {
    return document.cookie.match(/(?:^|;\s*)bili_jct=([^;]+)/)?.[1] || "";
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "include",
      ...options
    });

    return response.json();
  }

  async function getCurrentUserId() {
    const result = await requestJson("https://api.bilibili.com/x/web-interface/nav");

    if (result?.code !== 0 || !result?.data?.isLogin || !result?.data?.mid) {
      throw new Error("未检测到登录状态，请先登录 Bilibili 网页端。");
    }

    return result.data.mid;
  }

  async function getAllFollowings(uid) {
    const all = [];
    let page = 1;

    while (!window.__stopBiliUnfollow) {
      const params = new URLSearchParams({
        vmid: uid,
        pn: page,
        ps: config.pageSize,
        order: "desc",
        order_type: "attention"
      });

      const result = await requestJson(`https://api.bilibili.com/x/relation/followings?${params}`);
      const list = result?.data?.list || [];
      const total = result?.data?.total ?? "?";

      if (!list.length) break;

      all.push(...list);
      console.log(`已读取第 ${page} 页，累计 ${all.length}/${total}`);

      if (list.length < config.pageSize) break;

      page += 1;
      await sleep(config.fetchPageDelay);
    }

    return all;
  }

  function isRiskResponse(result) {
    if (!result || result.code === 0) return false;

    const text = [
      result.message,
      result.msg,
      JSON.stringify(result.data || {})
    ].filter(Boolean).join(" ");

    return /手机|手机号|验证|验证码|安全|风控|频繁|稍后|限制|实名|risk|verify|captcha/i.test(text);
  }

  async function unfollow(user, csrf) {
    const body = new URLSearchParams({
      fid: user.mid,
      act: 2,
      re_src: 11,
      csrf
    });

    const result = await requestJson("https://api.bilibili.com/x/relation/modify", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body
    });

    if (result?.code === 0) {
      console.log(`已取关：${user.uname} (${user.mid})`);
      return { ok: true, risk: false };
    }

    console.warn(`取关失败：${user.uname} (${user.mid})`, result);
    return {
      ok: false,
      risk: config.pauseOnRisk && isRiskResponse(result),
      result
    };
  }

  try {
    const csrf = getCsrfToken();
    if (!csrf) {
      throw new Error("没有找到 bili_jct，请确认已经登录 Bilibili 网页端。");
    }

    const uid = await getCurrentUserId();
    const list = await getAllFollowings(uid);

    if (!list.length) {
      console.log("没有读取到关注列表，已结束。");
      return;
    }

    const confirmed = window.confirm(
      `将取消当前登录账号的 ${list.length} 个关注。\n\n该操作不可批量撤销，确认继续吗？`
    );

    if (!confirmed) {
      console.log("用户取消操作。");
      return;
    }

    let done = 0;
    let ok = 0;

    for (let i = 0; i < list.length; i += config.batchSize) {
      if (window.__stopBiliUnfollow) {
        console.log("已停止。");
        break;
      }

      const batch = list.slice(i, i + config.batchSize);
      const results = await Promise.all(batch.map(user => unfollow(user, csrf)));
      const riskResult = results.find(result => result.risk);

      done += batch.length;
      ok += results.filter(result => result.ok).length;

      console.log(`进度：${done}/${list.length}，成功：${ok}`);

      if (riskResult) {
        window.__stopBiliUnfollow = true;
        console.warn("检测到可能的安全验证或频控响应，脚本已暂停。", riskResult.result);
        window.alert(
          "检测到 Bilibili 可能要求手机号/验证码/安全验证，脚本已暂停。\n\n请按网页提示完成官方验证，或稍后降低 batchSize 后重新运行。"
        );
        break;
      }

      await sleep(config.batchDelay);
    }

    console.log(`完成，成功取关 ${ok}/${list.length}`);
  } catch (error) {
    console.error(error);
  }
})();
