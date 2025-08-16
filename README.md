## 🔧 Key Features

| Feature                          | Description                                                                 |
|----------------------------------|-----------------------------------------------------------------------------|
| 🧹 Data Cleaning                 | Handle missing values, outliers, and incorrect passenger counts             |
| 🌍 Road Network Distance          | Compute **real driving routes** using **OSMnx** instead of Euclidean distance |
| ⚡ Machine Learning Model         | Implemented **XGBoost** regression for fare prediction                      |
| 📊 Evaluation Metrics             | Compare models using **R², RMSE, and MSE**                                 |
| 🎨 Web App Deployment            | Flask-based interface to test predictions interactively                     |

---

## 📊 Dataset
The dataset (sourced from **Kaggle**) contains the following fields:

- **key** → unique identifier for each trip  
- **fare_amount** → cost of each trip in USD  
- **pickup_datetime** → date and time when the meter was engaged  
- **passenger_count** → number of passengers in the vehicle (driver-entered)  
- **pickup_longitude** → longitude where the meter was engaged  
- **pickup_latitude** → latitude where the meter was engaged  
- **dropoff_longitude** → longitude where the meter was disengaged  
- **dropoff_latitude** → latitude where the meter was disengaged  

---

## 🎯 Objective
1. Understand and clean the dataset (if required).  
2. Build **regression models** to predict Uber ride fares.  
3. Evaluate and compare models using metrics such as **R², RMSE, and MSE**.  

---

## 🗂️ Project Structure
<pre>
project/
├── app.py               
├── prepare_input.py     
├── requirement.txt
├── xgb_fare_model.json   
├── static/             
│   ├── style.css        
│   ├── script.js        
│   └── images/          
└── templates/           
    └── index.html   
</pre>

---

## 🎥 Demo
<p align="center">
  <img src="Content/demo-web.gif" alt="Detection Example"/>
</p>

---

## 🧪 How to Run Locally
1. Install dependencies  
<pre>pip install -r requirements.txt</pre>
2. Run the app  
<pre>python app.py</pre>
3. Open in browser  
<pre>http://localhost:5000</pre>

| Metric | Value |
|--------|-------|
| 🧮 **MAE**  | 1.918 |
| 📏 **RMSE** | 3.679 |
| 📊 **R²**   | 0.831 |

✅ The results show that incorporating **real road distances from OSMnx** significantly improves the model’s accuracy compared to using straight-line (Euclidean) distances.  
