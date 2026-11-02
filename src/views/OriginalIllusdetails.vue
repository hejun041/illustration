<template>
    
    <div class="content">
      <div class="top">
      <div class="content-left">
         <div class="info">   
        <el-avatar :src="authorDetails.avatar" :size="40" class="avatar"></el-avatar>
        <div class="text">
          <div class="title"><span>{{illusDetails.title}}</span></div>
          <div class="author" ><span @click="toAuthor(illusDetails.ownerid)">{{authorDetails.name}}</span>
            <span v-if="(authorDetails._id!=userid)">
              <el-button type="text" size="mini" v-if="attentionArr.includes(authorDetails._id)" @click="cancelAttention(authorDetails._id)">已关注</el-button>
              <el-button type="text" size="mini" v-else @click="newAttention(authorDetails._id)">关注</el-button></span></div>
          </div>
        </div>

 <div class="book">
          <div class="desc">{{illusDetails.description}}</div>
          <div class="image">
          <el-image style="width: 100%; max-width: 984.3px; aspect-ratio: 984.3 / 692.9" :src="`https://api.kidstory.cc/`+illusDetails.content" fit="contain" /></div>
      </div>
         </div>


     
      

   
      <ul class="content-right">
       <li><el-avatar :size="56" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"></el-avatar></li>
       <li> <div v-if="likeIllusArr.includes(illusDetails._id)" class="item"><i  class="iconfont icon-aixin1" style="color:#F489B5"></i><span></span></div>
                <div v-else class="item"><i class="iconfont icon-aixin" @click="likeIllusFun(illusDetails._id)" ></i><span></span></div></li>
        <li>
                <div v-if="collectIllusArr.includes(illusDetails._id)" class="item"><i class="iconfont icon-shoucang1" style="color:#FFd301"></i><span></span></div>
                <div v-else class="item"><i class="iconfont icon-shoucang" @click="collectIllusFun(illusDetails._id)" ></i><span></span></div></li>
       </ul>
    
      </div>
      <suggestion />
    </div>
</template>

<script>
// @ is an alias to /src



//import RightInfo from "../components/RightInfo.vue";
import Suggestion from "../components/Suggestion.vue";
import { mapState } from 'vuex'
import { takePublicPageData } from '@/utils/publicPageData'
import { applyPublicDetailSeo } from '@/utils/seo'
import { getCollectionIllus, getLikeIllus, getAttention } from '@/api/userCollect'

export default {
  name: "OriginalIllusDetails",
  components: {

   Suggestion
  },
  data(){
    return{
     id:this.$route.params.illId,
     userid:localStorage.getItem("id"),
      illusDetails:[],
      authorDetails:[],
      authorId:'',   
    }
  },

  computed:mapState([
    "collectIllusArr","likeIllusArr","attentionArr"]),

  methods:{
    async getIllusDetails(){ 
      try{  
        const initial = takePublicPageData('illustration')
        if (initial && !Array.isArray(initial)) { this.illusDetails = initial; applyPublicDetailSeo(initial, this.$route.path); return }
        let res=await this.$http.get(`/ill/`+this.id)
        this.illusDetails=res.data.message
        applyPublicDetailSeo(this.illusDetails, this.$route.path)
      } catch(err){
        console.log(err)
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
     //新增收藏插画
     collectIllusFun(id) {
      this.$http
        .post(`/user/collect/`+id,{ownerid:this.userid,type:"illustration",collectid:id}
        ,{
          headers:{
            "Authorization":"Bearer "+localStorage.getItem("token")
          }
        })
        .then((response) => {
          if (response.data.desc === "success") {
              //把该插画ID添加到用户已收藏插画数组
              this.$store.commit("collectIllus",id)
          } 
        })
        .catch((error) => console.log(error));
    },
    setId(){
      
     this.authorId=this.illusDetails.ownerid
    },
    async getAuthor(){
      try{
        let res=await this.$http.get(`/user/`+this.authorId)
        this.authorDetails=res.data.message
       
      } catch(err){
        console.log(err)
      }
    },
    //关注
    newAttention(id){
      this.$http
        .post(`/user/fllow/`+id,{},
        {
          headers:{
            "Authorization":"Bearer "+localStorage.getItem("token")
          }
        })
        .then((response) => {
          console.log(this.attentionArr)
          if (response.data.desc === "success") {
              //把该用户ID到用户已关注数组
              this.$store.commit("myAttention",id)
          } 
        })
        .catch((error) => console.log(error));
   },
   //取消关注
   cancelAttention(id){
      this.$http
        .delete(`/user/list/fllow?id=`+id,
        {
          headers:{
            "Authorization":"Bearer "+localStorage.getItem("token")
          }
        },
    )
        .then((response) => {
          console.log(this.attentionArr)
          if (response.data.desc === "success") {
              //把该用户ID到用户已关注数组
              this.$store.commit("cancelAttention",id)
              console.log(this.attentionArr)
          } 
        })
        .catch((error) => console.log(error));
   },
  
    toAuthor(id){
      this.$router.push({name:'user-g',params:{authorId:id}});
    },
    toLogin(){
      this.$store.commit("showMask",true)
      this.$store.commit("showLoginBox",true)
    }
  },
  async mounted() {
    if (this.userid && localStorage.getItem('token')) {
      await Promise.all([
        getCollectionIllus(this.$http, this.$store),
        getLikeIllus(this.$http, this.$store),
        getAttention(this.$http, this.$store)
      ])
    }
    await this.getIllusDetails()
    await this.setId()
    await this.getAuthor()
  }

};
</script>
<style scoped>
.content {
  width:100%;
  background-color: #f5f6fa;
   color:#333;
    margin:0;
    height:90vh;
    overflow-y: scroll;
}
.top{
  width:100%;
  min-height:90vh;
  margin:0;
  display: flex;
  justify-content: center;
}
.content-left {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  max-width: 1024px;
  min-height: 90vh;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
}
.content-right{
  flex: 0 0 40px;
  width:40px;
 height:70vh;
 margin-left:40px;
 margin-top:20vh;
}
.content-right li{
  width:40px;
  height:20vh;
  display: flex;
 flex-direction: column;
 
        
}
.content-right li .item .iconfont{
  font-size:40px;
  text-align: center;
  cursor:pointer;
}
.content-right li .item span{
  font-size: 18px;
  display: block;
  text-align: center;
  
}
.content-left .info {
  display: flex;
  flex-wrap: nowrap;
   width:100%;
   max-width:984.3px;
   box-sizing:border-box;
  padding:16px;
  color:#606266;
  margin:0 auto;
 

}
.content-left .book{
  width: 100%;
  max-width: 984.3px;
  box-sizing: border-box;
  min-height: 200px;
  background-color: #fff;
  margin:auto;
  margin-top: 0px;
  font-size:20px;
  font-weight: 600;
}
.content-left .book .desc{
  width:100%;
  box-sizing:border-box;
  min-height:116px;
  padding:48px;
  font-size: 20;
  letter-spacing: 2px;
  background-color: #fff;
  color:#1c345e;
  
}
.content-left .info .avatar{
  cursor: pointer;
}
.content-left .image{
  background-color: #fff;
  margin-top:8px;
  
}
.content-left .info .text{
  font-size:16px;
  margin-left:16px;
  font-weight: bold;
  text-align: left;
}
.content-left .info .text .title{
   font-weight:700;
  user-select: none;
  height:24px;
  line-height: 24px;
}

.content-left .info .text .author{
   font-size:14px;
   font-weight:400;
   cursor:pointer
}
.content-left .info .text .author span{
  margin-right: 16px;
}

.el-descriptions-item__cell{
  padding:16px;
  font-size:18px;
}

/* 详情图按容器比例自适应填充 */
.content-left .image :deep(.el-image__inner){
  width:100%;
  height:100%;
  object-fit: contain;
}

/* 手机端：缩小内边距、收紧右侧操作栏间距 */
@media (max-width: 768px) {
  .top {
    padding: 0 8px;
    box-sizing: border-box;
  }
  .content-left .book .desc {
    padding: 24px;
  }
  .content-right {
    margin-left: 12px;
    margin-top: 12vh;
  }
}
</style>
