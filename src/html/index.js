/* eslint-disable @typescript-eslint/semi */
class Loading {
  #loading;
  constructor(loadingDom) {
    this.loading = loadingDom;
  }
  showLoading() {
    renderList([]);
    this.loading.style.display = "block";
  }
  hiddenLoading() {
    this.loading.style.display = "none";
  }
}
const loading = new Loading(document.querySelector(".loader"));

const vscode = acquireVsCodeApi();
const iconsList = document.querySelector(".iconsList");
let projectIcons = []; // 当前项目的所有数据
let iconfontSearch = []; // 全局的icons显示
let operateType = "refresh";
let currentPage = 1;
let currentTransionMethod = "svg"; // 当前传输方式
//导航部分
class NavTabs {
  #navButtons; //tabs按钮组
  #active; //当前活跃项 projectIcons--项目 iconsSearch --全局
  #projectSearch; //项目内查询组件
  #queryGlobalSearch; //全局搜索组件
  #requestProjectIconBtn; //刷新项目按钮dom
  #searchProject; // 搜索项目icons
  #queryGlobalIcons; // 搜索全局icons
  #iconsItem;
  #transfer; // 传输按钮

  constructor(dom) {
    this.navButtons = document.querySelector(".nav");
    this.active = "projectIcons";
    this.projectSearch = document.querySelectorAll(".search-box")[0]; //查询刷新项目组件
    this.queryGlobalSearch = document.querySelectorAll(".search-box")[1]; //查询全局组件
    this.requestProjectIconBtn = document.querySelector(".refresh");
    this.searchProject = document.querySelector("#searchProject");
    this.queryGlobalIcons = document.querySelector("#queryGlobalIcons"); //iconfont全局搜索input元素
    this.iconsItem = document.querySelector(".iconsList"); // 当前点击的按钮组
    this.transfer = document.querySelector(".transfer");
  }
  // 切换按钮触发渲染事件
  changeActive() {
    switch (this.active) {
      case "projectIcons":
        //渲染
        renderList(projectIcons);
        this.projectSearch.classList.add("show");
        this.queryGlobalSearch.classList.remove("show");
        document.getElementById("paging").style.display = "none";
        break;
      case "iconsSearch":
        //渲染
        renderList(iconfontSearch);
        this.projectSearch.classList.remove("show");
        this.queryGlobalSearch.classList.add("show");
        document.getElementById("paging").style.display = "flex";
        break;
    }
    document.querySelectorAll(".nav-link").forEach(item => {
      item.classList.remove("active");
      if (item.id == this.active) {
        item.classList.add("active");
      }
    });
  }
  // 监听点击tabs事件
  listenerClick() {
    this.navButtons.addEventListener("click", e => {
      if (e.target.classList.value.indexOf("nav-link") > -1) {
        if (this.active === e.target.id) return;
        this.active = e.target.id;
        this.changeActive();
      }
    });
  }
  // 监听点击刷新按钮事件
  refreshProjectIcons() {
    this.requestProjectIconBtn.addEventListener("click", () => {
      console.log("点击刷新按钮");
      refreshIcons();
    });
  }
  // 查询项目中的图标
  searchFromProject() {
    searchProject.addEventListener("keyup", e => {
      // 判断是否按下回车键
      if (e.keyCode === 13) {
        // 回车键被按下，执行你想要的操作
        console.log("按下了回车键");
        const value = e.target.value;
        const searchFilter = projectIcons.filter(val => {
          if (!value) return true;
          return (
            val.name.indexOf(value) !== -1 || val.code.indexOf(value) !== -1
          );
        });
        renderList(searchFilter);
      }
    });
  }
  // 查询全局
  searchGlobalIcons() {
    queryGlobalIcons.addEventListener("keyup", e => {
      // 判断是否按下回车键
      if (e.keyCode === 13) {
        // 回车键被按下，执行你想要的操作
        console.log("按下了回车键");
        const value = e.target.value;
        searchIcons(value);
        renderList(iconfontSearch);
      }
    });
  }
  // 删除图标
  delIconFromProject() {
    this.iconsItem.addEventListener("click", async e => {
      // 处理复制按钮点击
      if (e.target.classList.contains("copy-btn")) {
        const text = e.target.dataset.copy;
        copyToClipboard(text);
        return;
      }

      const classL = []
        .concat(e.path[0].classList.value, e.path[1].classList.value)
        .join(",");
      console.log(classL);
      if (classL.includes("operationSvg")) {
        console.log(
          "当前点击的icon",
          e.path[0].dataset.id,
          e.path[1].dataset.id
        );
        const id = e.path[0].dataset.id || e.path[1].dataset.id;
        if (classL.includes("add")) {
          if (id) addIconsToProject(id);
        } else if (classL.includes("delete")) {
          if (id) deleteIconFromProject(id);
        } else if (classL.includes("translate")) {
          sendMessage("transition", { id: id, type: this.active });
        }
        // if (navTabs.active === 'projectIcons') {
        //   if (id) deleteIconFromProject(id);
        // } else if (navTabs.active === 'iconsSearch') {
        //   if (id) addIconsToProject(id);
        // }
      }
    });
  }
  // 监听传输按钮点击事件
  transitionHandle() {
    this.transfer.addEventListener("click", () => {
      transformIcons();
    });
  }
}
const navTabs = new NavTabs();
navTabs.listenerClick();
navTabs.refreshProjectIcons();
navTabs.searchFromProject();
navTabs.searchGlobalIcons();
navTabs.delIconFromProject();
navTabs.transitionHandle();

function sendMessage(msgType, data) {
  operateType = msgType;
  if (msgType !== "transition" && msgType !== "info") {
    loading.showLoading();
  }
  try {
    webviewDebug("[Webview] Sending message to extension: " + msgType);
  } catch (e) {}
  vscode.postMessage({
    type: msgType,
    data,
  });
}
document.querySelector("#selectWs").addEventListener("change", function (e) {
  vscode.postMessage({
    type: "select",
    data: e.target.value,
  });
});
document.querySelector("#paging").addEventListener("click", function (e) {
  if (e.target.nodeName === "LI" && currentPage !== +e.target.innerText) {
    currentPage = +e.target.innerText;
    searchIcons(searchText, +e.target.innerText);
  }
});
function pageStyle(current) {
  setTimeout(() => {
    let allLi = [...document.querySelectorAll("#paging li")];
    const length = allLi.length;
    allLi.map((item, index) => {
      if (
        index === 0 ||
        index === length - 1 ||
        (index >= current - 3 && index <= current + 1)
      ) {
        item.style.display = "block";
      } else {
        item.style.display =
          length < 10 || (current < 8 && index < 8) ? "block" : "none";
      }
      if (index === current - 1) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
    let class1 = [];
    if (length > 10) {
      if (current - 3 > 1 && current > 7) {
        class1.push("left");
      }
      if (current + 3 < length) {
        class1.push("right");
      }
    }
    console.log(class1);
    document.querySelector("#paging").className = class1.length
      ? class1.join(" ")
      : "";
  });
}
window.addEventListener("message", e => {
  let pages = 0;
  switch (e.data.type) {
    case "projectIcons":
      projectIcons = e.data.data;
      break;
    case "iconsSearch":
      iconfontSearch = e.data.data;
      pages = e.data.pages;
      if (pages > 1) {
        document.getElementById("paging").style.display = "flex";
        document.getElementById("paging").innerHTML = new Array(pages)
          .fill("index")
          .map((item, index) => `<li>${index + 1}</li>`)
          .join("\n");
      } else {
        document.getElementById("paging").style.display = "none";
      }
      pageStyle(currentPage);
      break;
    case "wslist":
      const str = e.data.data
        .map(
          item =>
            `<option value="${item.projectName}" selected=${Boolean(
              item.active
            )}>${item.projectName}</option>`
        )
        .join("");
      document.getElementById("selectWs").innerHTML = str.replace(
        /selected\=false/g,
        ""
      );
      const activeProject = e.data.data.find(item => item.active);
      if (activeProject) {
        currentTransionMethod = activeProject.transionMethod;
      }
  }
  loading.hiddenLoading();
  navTabs.active = e.data.type !== "wslist" ? e.data.type : navTabs.active;
  navTabs.changeActive();
});

// 渲染函数
function renderList(icons) {
  iconsList.innerHTML = icons
    .map(item => {
      const isFontClass = currentTransionMethod === "font-class";
      const isProjectIcons = navTabs.active === "projectIcons";

      let operations = "";
      if (isProjectIcons) {
        if (isFontClass) {
          operations = `
          <span class="copy-btn" data-copy="iconfont ${item.fontClass}">复制Class</span>
          <span class="copy-btn" data-copy='<ScIcon iconClass="iconfont ${item.fontClass}" />'>复制代码</span>
        `;
        } else {
          operations = `
          <span title="点击从项目中删除此icon"><svg data-id="${item.id}" class="operationSvg delete" fill="currentColor" t="1693200958055" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="13688" width="30" height="30"><path d="M840 288H688v-56c0-40-32-72-72-72h-208C368 160 336 192 336 232V288h-152c-12.8 0-24 11.2-24 24s11.2 24 24 24h656c12.8 0 24-11.2 24-24s-11.2-24-24-24zM384 288v-56c0-12.8 11.2-24 24-24h208c12.8 0 24 11.2 24 24V288H384zM758.4 384c-12.8 0-24 11.2-24 24v363.2c0 24-19.2 44.8-44.8 44.8H332.8c-24 0-44.8-19.2-44.8-44.8V408c0-12.8-11.2-24-24-24s-24 11.2-24 24v363.2c0 51.2 41.6 92.8 92.8 92.8h358.4c51.2 0 92.8-41.6 92.8-92.8V408c-1.6-12.8-12.8-24-25.6-24z" p-id="13689"></path><path d="M444.8 744v-336c0-12.8-11.2-24-24-24s-24 11.2-24 24v336c0 12.8 11.2 24 24 24s24-11.2 24-24zM627.2 744v-336c0-12.8-11.2-24-24-24s-24 11.2-24 24v336c0 12.8 11.2 24 24 24s24-11.2 24-24z" p-id="13690"></path></svg></span>
          <span title="点击导出单个图标到本地项目中"><svg class="operationSvg translate" data-id="${item.id}" fill="currentColor" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2045" width="24" height="24"><path d="M973.824 366.20288L734.35136 126.75072c-13.47584-13.47584-33.81248-17.1008-51.22048-8.94976-16.09728 7.55712-25.96864 24.1664-25.96864 41.94304v89.04704H482.304c-18.78016 0-34.01728 15.23712-34.01728 34.01728 0 18.78016 15.23712 34.01728 34.01728 34.01728h197.67296c24.96512 0 45.21984-20.25472 45.21984-45.21984v-57.81504l184.40192 184.40192-184.40192 184.40192v-57.81504c0-23.2448-17.55136-42.3936-40.09984-44.93312v-0.3072H374.1696v-89.06752c0-17.77664-9.89184-34.38592-25.98912-41.94304-17.408-8.15104-37.74464-4.52608-51.22048 8.94976L57.50784 596.95104c-17.63328 17.63328-17.63328 46.32576 0 63.95904L296.96 900.36224c8.66304 8.66304 20.19328 13.27104 31.92832 13.27104 6.57408 0 13.2096-1.4336 19.456-4.4032 16.01536-7.5776 25.8048-24.14592 25.8048-41.86112v-89.04704h174.85824c18.78016 0 34.01728-15.23712 34.01728-34.01728 0-18.78016-15.23712-34.01728-34.01728-34.01728h-197.67296c-24.96512 0-45.21984 20.25472-45.21984 45.21984v57.81504L121.73312 628.9408l184.40192-184.40192v57.81504c0 23.2448 17.55136 42.3936 40.09984 44.93312v0.3072h310.92736v89.06752c0 17.73568 9.8304 34.304 25.86624 41.86112 6.2464 2.94912 12.86144 4.38272 19.39456 4.38272 11.73504 0 23.26528-4.58752 31.92832-13.27104L973.824 430.16192c8.54016-8.54016 13.25056-19.90656 13.25056-31.96928-0.02048-12.0832-4.7104-23.4496-13.25056-31.98976z" p-id="2046"></path></svg></span>
        `;
        }
      } else {
        operations = `
        <span title="点击添加icon到项目中"><svg data-id="${item.id}" class="operationSvg add" fill="currentColor" t="1693202356794" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="10320" width="24" height="24"><path d="M922.8 338.5c-22.5-53.1-54.6-100.8-95.5-141.7-40.9-40.9-88.6-73.1-141.7-95.5-55-23.3-113.4-35-173.5-35-60.2 0-118.6 11.8-173.5 35-53.1 22.5-100.8 54.6-141.7 95.5s-73.1 88.6-95.5 141.7c-23.3 55-35 113.4-35 173.5 0 60.2 11.8 118.6 35 173.5 22.5 53.1 54.6 100.8 95.5 141.7 40.9 40.9 88.6 73.1 141.7 95.5 55 23.3 113.4 35 173.5 35 60.2 0 118.6-11.8 173.5-35 53.1-22.5 100.8-54.6 141.7-95.5 40.9-40.9 73.1-88.6 95.5-141.7 23.3-55 35-113.4 35-173.5 0-60.2-11.8-118.6-35-173.5zM782 782c-72.1 72.1-168 111.8-270 111.8S314.1 854.1 242 782 130.2 614 130.2 512 169.9 314.1 242 242s168-111.8 270-111.8S709.9 169.9 782 242s111.8 168 111.8 270S854.1 709.9 782 782z" p-id="10321"></path><path d="M707.9 473.3H560.7V326.1c0-17.7-14.3-32-32-32s-32 14.3-32 32v147.2H349.4c-17.7 0-32 14.3-32 32s14.3 32 32 32h147.3v147.3c0 17.7 14.3 32 32 32s32-14.3 32-32V537.3h147.2c17.7 0 32-14.3 32-32s-14.3-32-32-32z" p-id="10322"></path></svg></span>
        <span title="点击导出单个图标到本地项目中"><svg class="operationSvg translate" data-id="${item.id}" fill="currentColor" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2045" width="24" height="24"><path d="M973.824 366.20288L734.35136 126.75072c-13.47584-13.47584-33.81248-17.1008-51.22048-8.94976-16.09728 7.55712-25.96864 24.1664-25.96864 41.94304v89.04704H482.304c-18.78016 0-34.01728 15.23712-34.01728 34.01728 0 18.78016 15.23712 34.01728 34.01728 34.01728h197.67296c24.96512 0 45.21984-20.25472 45.21984-45.21984v-57.81504l184.40192 184.40192-184.40192 184.40192v-57.81504c0-23.2448-17.55136-42.3936-40.09984-44.93312v-0.3072H374.1696v-89.06752c0-17.77664-9.89184-34.38592-25.98912-41.94304-17.408-8.15104-37.74464-4.52608-51.22048 8.94976L57.50784 596.95104c-17.63328 17.63328-17.63328 46.32576 0 63.95904L296.96 900.36224c8.66304 8.66304 20.19328 13.27104 31.92832 13.27104 6.57408 0 13.2096-1.4336 19.456-4.4032 16.01536-7.5776 25.8048-24.14592 25.8048-41.86112v-89.04704h174.85824c18.78016 0 34.01728-15.23712 34.01728-34.01728 0-18.78016-15.23712-34.01728-34.01728-34.01728h-197.67296c-24.96512 0-45.21984 20.25472-45.21984 45.21984v57.81504L121.73312 628.9408l184.40192-184.40192v57.81504c0 23.2448 17.55136 42.3936 40.09984 44.93312v0.3072h310.92736v89.06752c0 17.73568 9.8304 34.304 25.86624 41.86112 6.2464 2.94912 12.86144 4.38272 19.39456 4.38272 11.73504 0 23.26528-4.58752 31.92832-13.27104L973.824 430.16192c8.54016-8.54016 13.25056-19.90656 13.25056-31.96928-0.02048-12.0832-4.7104-23.4496-13.25056-31.98976z" p-id="2046"></path></svg></span>
      `;
      }

      return `<li id="icon_${item.id}">
        <div>
          <span class="anticon svg">
            ${item.showSvg}
          </span>
          <div class="icon-name">
            ${item.name}
          </div>
          <div class="icon-name icon-code">
            ${item.fontClass}
          </div>
        </div>
        <div class="operationMask">
          <div>
            ${operations}
          </div>
        </div>
      </li>`;
    })
    .join("\n");
  // formatIcon();
}
// 从iconfont官网同步icons
function refreshIcons() {
  sendMessage("refresh");
}
// 传输icons到项目中
function transformIcons() {
  sendMessage("transition");
}
// 搜索icons
let searchText = "";
function searchIcons(searchValue, page) {
  searchText = searchValue;
  sendMessage("search", { searchValue, page });
}
// icon添加到项目中
function addIconsToProject(id) {
  sendMessage("add", id);
}
// 项目中删除icon
function deleteIconFromProject(id) {
  sendMessage("delete", id);
}

function copyToClipboard(text) {
  const input = document.createElement("input");
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
  sendMessage("info", "复制成功");
}

document.querySelector("#onoffswitch").addEventListener("click", function () {
  console.log(this.checked);
  if (this.checked) {
    document.body.className = "vscode-light";
  } else {
    document.body.className = "vscode-dark";
  }
});
