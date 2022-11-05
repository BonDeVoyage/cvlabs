import './App.css';

import React from 'react';
import { Button, Select, Slider, MenuItem } from '@mui/material';
import { UploadFileOutlined, DeleteOutline, SaveOutlined } from '@mui/icons-material'
import cv, { imshow } from "@techstark/opencv-js";
import Plot from 'react-plotly.js';
import { sizeHeight } from '@mui/system';

window.cv = cv;

class App extends React.Component {
  constructor(props)
  {
    super(props)

    this.grayImgRef = React.createRef();
    this.plot = React.createRef();
    this.state = {
      imgUrl:"",
      img:"",

      datax_r:[],
      datay_r:[],

      btn_upload_variant:"outlined",
      btn_clear_variant:"outlined",

      graph_type:"bar",
      datay:[],
      datax:[],

      avg:"",
      disp:"",

      h:1,
      img_intensity:0,
      img_intensity_prev:null
    }
  }

  handleSliderChange = (event, newValue) => {
    this.setState({h:newValue}, () => {
      if (this.state.img !== "")
        this.process_image(this.state.img)
    })
  };

  handleIntensitySliderChange = (event, newValue) => {
    this.setState({img_intensity:newValue}, () => {
      if (this.state.img !== "")
        this.process_image(this.state.img)
    })
  };


  upload_image = (e) => {
    if (e.target.files[0]) {
      this.setState({
        imgUrl: URL.createObjectURL(e.target.files[0])
      });
    }
  }

  calculate_average = (resy, sums) => {
    let group_avg = [];
    let avg = 0

    for (let i = 0; i < sums.length; i++)
    {
      let avg = 0
      for (let j = 0; j < (( (i === sums.length - 1) && (256 % this.state.h) ) ? 256 % this.state.h : this.state.h); j++)
      {
          if (sums[i] !== 0)
            avg += resy[j + i * this.state.h] * (j + i * this.state.h) / sums[i]
      }
      
      group_avg.push(avg);
    }

    for (let i = 0; i < group_avg.length; ++i)
    {
      avg += group_avg[i] * sums[i]
    }

    this.setState({avg: (avg / resy.reduce((a,b) => (a + b))).toFixed(2), group_avg: group_avg}, () => {
      this.calculate_dispersion(this.state.avg, group_avg, sums)
    })
  }

  calculate_dispersion = (avg, group_avg, sums) =>
  {
    let disp = 0
    for (let i = 0; i < group_avg.length; ++i)
    {
      disp += (group_avg[i] - avg) * (group_avg[i] - avg) * sums[i]
    }

    this.setState({disp: (Math.sqrt(disp / sums.reduce((a,b) => a + b))).toFixed(2)})
  }

  process_image = (e) => {
    let resx_step = []
    let resy_step = []

    if (this.state.img_intensity !== this.state.img_intensity_prev)
    {
      let img = cv.imread(e.target);
      let images = new cv.MatVector();
      let histRange = [0, 256]
      let hist = new cv.Mat();
      let mask = new cv.Mat();
      let resy = []

      cv.cvtColor(img, img, cv.COLOR_RGB2GRAY, 0);

      for (let i = 0; i < img.rows; ++i)
      {
        for (let j = 0; j < img.cols; ++j)
        {
          let new_intensity = img.ucharPtr(i, j)[0] + this.state.img_intensity;
          if (new_intensity >= 255)
            img.ucharPtr(i, j)[0] = 255
          else if (new_intensity <= 0)
            img.ucharPtr(i, j)[0] = 0
          else
            img.ucharPtr(i, j)[0] = new_intensity
        }
      }

      cv.imshow(this.grayImgRef.current, img);
      images.push_back(img)
  
      //calcHist (image, channels, mask, hist, histSize, ranges, accumulate = false)
      cv.calcHist(images, [0], mask, hist, [256], histRange, false);
  
      for (let i = 0; i < 256; i++)
      {
        resy.push(hist.data32F[i])
      }

      for (let i = 0; i < Math.ceil(256/this.state.h); ++i)
      {
        let sum = 0
        for (let j = 0; j < (( (i === Math.ceil(256/this.state.h) - 1) && (256 % this.state.h) ) ? 256 % this.state.h : this.state.h); j++)
        {
          sum += resy[j + i * this.state.h];
        }
        resy_step.push(sum);
        resx_step.push(i);
      }

      this.calculate_average(resy, resy_step);
      this.setState({datay_r: resy})

      img.delete()
      images.delete()
      mask.delete()
      hist.delete()
    }
    else
    {
      for (let i = 0; i < Math.ceil(256/this.state.h); ++i)
      {
        let sum = 0
        for (let j = 0; j < (( (i === Math.ceil(256/this.state.h) - 1) && (256 % this.state.h) ) ? 256 % this.state.h : this.state.h); j++)
        {
          sum += this.state.datay_r[j + i * this.state.h];
        }
        resy_step.push(sum);
        resx_step.push(i);
      }

      this.calculate_average(this.state.datay_r, resy_step);
    }

    this.setState({datay: resy_step, datax: resx_step, img_intensity_prev: this.state.img_intensity})
  }

  render() {
    return (
      <div className='window-main'>
        <div className="workspace">
          <div className='options'>
            <Button 
              variant={this.state.btn_upload_variant} 
              onMouseEnter={() => this.setState({btn_upload_variant:"contained"})}
              onMouseLeave={() => this.setState({btn_upload_variant:"outlined"})}
              component="label" 
              endIcon={<UploadFileOutlined />}>
                Upload image
                <input onChange={this.upload_image} hidden accept="image/*" type="file" />
            </Button>
            <Button
              onMouseEnter={() => this.setState({btn_clear_variant:"contained"})}
              onMouseLeave={() => this.setState({btn_clear_variant:"outlined"})}
              onClick={() => {
                let context = this.grayImgRef.current.getContext('2d')
                context.clearRect(0, 0, context.canvas.width, context.canvas.height);
                this.setState({imgUrl:"", img:"", avg:"", datax:[], datay:[], img_intensity_prev:null})}
              }
              variant={this.state.btn_clear_variant} 
              endIcon={<DeleteOutline />}>
                Clear results
            </Button>
            <div className='slid'>
              Step:
              <Slider
                value={this.state.h}
                onChange={this.handleSliderChange}
                aria-labelledby="input-slider"
                min={1}
                max={256}
              />
              {this.state.h}
            </div>
            <div className='slid'>
              Intensity:
              <Slider
                value={this.state.img_intensity}
                onChange={this.handleIntensitySliderChange}
                aria-labelledby="input-slider"
                min={-256}
                max={256}
              />
              {this.state.img_intensity}
            </div>
            <div className='graphType'>
              Graph Type:
              <Select
                value={this.state.graph_type}
                label="Graph Type"
                onChange={(e) => this.setState({graph_type: e.target.value})}
              >
                <MenuItem value="bar">Bar</MenuItem>
                <MenuItem value="scatter">Scatter</MenuItem>
              </Select>
            </div>
          </div>
          <div className='result'>
            <div className='result-img'>
              <div className='result-img-orig'>
                <img
                  src={this.state.imgUrl}
                  id="image"
                  onLoad={(e) => {
                    this.setState({img:e}, () => {
                      this.process_image(e);
                    })
                  }}
                />
              </div>
              <div className='result-img-gray'>
                <canvas ref={this.grayImgRef} />
              </div>
            </div>
            <div className='result-histogram'>
              {
                this.state.datax.length !==0 && this.state.datay.length !==0 ? <Plot 
                  ref={this.plot}
                  data={[
                    {
                      type: this.state.graph_type, 
                      x: this.state.datax, 
                      y: this.state.datay
                    }
                  ]}
                  layout={ {width: 920, height: 440, title: 'Avg: ' + this.state.avg + " | Dispersion: " + this.state.disp} }
                /> : null
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
