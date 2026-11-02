<template>
  <div>
    <div class="content">
      <div class="content-left">
        <div class="el-select">
          <el-select
            v-model="model"
            style="width: 160px; margin: 0"
            placeholder="排序方式"
            size="mini"
          >
            <el-option
              v-for="item in sortList"
              :value="item.value"
              :key="item.value"
              >{{ item.label }}</el-option
            >
          </el-select>
        </div>

        <div class="items" v-infinite-scroll="load">
          <div class="item" v-for="item in illsArry" :key="item._id">
            <div>
              <el-image lazy loading="lazy" decoding="async"
                :src="$illustrationPreview(item)" @error="$thumbnailFailed(item)"
                class="image"
                fit="cover"
                @click="toDetail(item._id)"
              />
              <div class="data">
                <a class="name" :href="`/illustration/${item._id}`">{{ item.title }}</a>
                <div class="icon"
                  ><span v-if="likeIllusArr.includes(item._id)" ><i class="iconfont icon-aixin1" style="color:#F489B5"></i></span>
                  <span v-else><i  class="iconfont icon-aixin" @click="likeIllusFun(item._id)"></i></span></div
                >
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
// @ is an alias to /src

import { mapState } from 'vuex'
import { getCollectionIllus, getLikeIllus } from '@/api/userCollect'
import { takePublicPageData } from '@/utils/publicPageData'

export default {
  name: "OriginalIllustration",
  components: {
  },
  data() {
    return {
      userid:localStorage.getItem("id"),
      illsArry: [],
      num: Math.max(1, Math.min(10000, Number(this.$route.query.page) || 1)),
      sortList: [
        {
          value: "default",
          label: "默认",
        },
        {
          value: "hot",
          label: "热度",
        },
        {
          value: "time",
          label: "时间",
        },
      ],
      model: "",
      button1: "不限",
      button2: "不限",
    };
  },
  computed:mapState([
        "collectIllusArr",
        "likeIllusArr",
    ]),
  methods: {
    toDetail(id) {
      window.location.assign(`/illustration/${id}`);
    },
    getIllus() {
      const initial = takePublicPageData('illustration')
      if (Array.isArray(initial)) { this.illsArry = initial; return }
      this.$http
        .get(`/ill/public?page=${this.num}`)
        .then((response) => {
          this.illsArry = response.data.message;
          console.log(this.illsArry);
        })
        .catch((error) => console.log(error));
    },
    async load() {
      this.num++;
      try {
        let res = await this.$http.get(
          `/ill/public?page=` + this.num
        );
        console.log(res.data.message);
        this.illsArry = this.illsArry.concat(res.data.message);
        console.log(this.illsArry);
      } catch (err) {
        console.log(err);
      }
    },

    //新增喜欢插画
    likeIllusFun(id) {     
      this.$http
        .post(`/user/like/`+id,{ownerid:this.userid,type:"illustration",likeid:id}
        ,{
          headers:{
            "Authorization":"Bearer "+localStorage.getItem("token")
          }
        })
        .then((response) => {
          console.log(response)
          if (response.data.desc === "success") {
              //把该插画ID添加到用户已收藏插画数组
              this.$store.commit("likeIllus",id)
          } 
        })
        .catch((error) => console.log(error));
    },
  },
  async mounted() {
    if (this.userid && localStorage.getItem('token')) {
      await Promise.all([
        getCollectionIllus(this.$http, this.$store),
        getLikeIllus(this.$http, this.$store)
      ])
    }
    this.getIllus()
  },
}
</script>
<style scoped>
.content {
  display: flex;
  justify-content: center;
}
.content-left {
  width: 1200px;
  max-width: 90vw;
  height: 88vh;
  background-color: #f5f6fa;
  overflow-y: scroll;
  margin: 0 auto;
}
.items {
  width: 100%;
  padding: 0 12px;
  height: auto;
  margin-top: 2vh;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 24px;
}
.item {
  box-sizing: border-box;
  flex: 0 0 calc((100% - 48px) / 3); /* 三列布局 */
  margin: 0;
  overflow: hidden;
  border-radius: 4px;
  user-select: none;
}
.image {
  cursor: pointer;
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.1);
  background-color: #fff;
}
.text {
  margin-top: 1vh;
}
.data {
  display: flex;
  height: 18px;
  justify-content: space-between;
  color: #606266;
  align-items: center;
}
.data .name {
  max-width: 70%;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipse;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
}
.data .icon {
  width: 44px;
  font-size: 14px;
 display: inline-flex;
 justify-content: flex-end;
 align-items: center;
  cursor: pointer;
}

.el-select {
  margin-top: 16px;
  width: 100%;
  display: flex;
  justify-content: space-around;
  height: 30px;
  padding: 0 12px;
}

/* 手机端：三列改两列，避免列过窄 */
@media (max-width: 768px) {
  .item {
    flex: 0 0 calc((100% - 24px) / 2);
  }
}
</style>




