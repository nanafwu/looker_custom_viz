/**
 * Welcome to the Looker Visualization Builder! Please refer to the following resources 
 * to help you write your visualization:
 *  - API Documentation - https://github.com/looker/custom_visualizations_v2/blob/master/docs/api_reference.md
 *  - Example Visualizations - https://github.com/looker/custom_visualizations_v2/tree/master/src/examples
 **/

function compareConversionProbability (
  variantALabel, variantBLabel,
  alphaPosteriorA, betaPosteriorA, alphaPosteriorB, betaPosteriorB) {
  var samples = 20000;
  var aGreaterThanB = 0;
  var bGreaterThanA = 0;
    
  _.map(_.range(samples), function(i){ 
    var sampleA = jStat.beta.sample(alphaPosteriorA, betaPosteriorA); 
    var sampleB = jStat.beta.sample(alphaPosteriorB, betaPosteriorB); 
    if (sampleA > sampleB) {
      aGreaterThanB += 1;
    } else {
      bGreaterThanA += 1;
    }  
  }); 
  
  var probAGreaterThan_B = Math.round((aGreaterThanB / samples) * 100);
  var probBGreaterThan_A = Math.round((bGreaterThanA / samples) * 100);
  
  if (probAGreaterThan_B > probBGreaterThan_A) {
    return 'There is a ' + probAGreaterThan_B + '% chance that ' + variantALabel + ' converts better than ' + variantBLabel + ".";
  } else {
    return 'There is a ' + probBGreaterThan_A + '% chance that ' + variantBLabel + ' converts better than ' + variantALabel + ".";
  }
}

/*
Get dimensions or measures to use for variant, 
# visitors, and # conversions.
Set the 1st string dimension as the "variant".
Set the 2nd numeric dimension as the "# visitors".
Set the 3rd numeric dimension as the "conversions".
*/
function getLabels(queryResponse) {
  
    var lblVariant, lblVisitors, lblCnversions;
    
    // First check dimensions
    for(var dim of queryResponse.fields.dimensions) {
      if (!lblVariant && dim.type === "string") {
        lblVariant = dim.name
      } else if (!lblVisitors && dim.type == "number") {
        lblVisitors = dim.name
      } else if (!lblCnversions && dim.type == "number") {
        lblCnversions = dim.name
      }
    }
    // Next check measures
    for(var msr of queryResponse.fields.measures) {
      if (!lblVariant && msr.type === "string") {
        lblVariant = msr.name
      } else if (!lblVisitors && msr.type == "number") {
        lblVisitors = msr.name
      } else if (!lblCnversions && msr.type == "number") {
        lblCnversions = msr.name
      }
    }
    
    return {
      variant: lblVariant,
      visitors: lblVisitors,
      conversions: lblCnversions
    }
}


/*
Get the data to use for AB test calculations.
Only check first two rows of data
*/
function getABTestData(data, labelVariant, labelVisitors, labelConversions) {

    var visitorsToA = data[0][labelVisitors].value; 
    var visitorsToB = data[1][labelVisitors].value; 
    
    var conversionsFromA = data[0][labelConversions].value; 
    var conversionsFromB = data[1][labelConversions].value; 
  
    var variantALabel = data[0][labelVariant].value; 
    var variantBLabel = data[1][labelVariant].value;
      
    return {
      variantALabel: variantALabel,
      variantBLabel: variantBLabel,
      visitorsToA: visitorsToA,
      visitorsToB: visitorsToB,
      conversionsFromA: conversionsFromA,
      conversionsFromB: conversionsFromB
    }
}

/*
Calculate credible intervals with the Highest Posterior Densities
for a given beta distribution.
*/
function calculateCredibleInterval(ciPercent, alpha, beta) {

  var ciProbability = ((100 - ciPercent) / 2) / 100;
  console.log(ciProbability + " CI: ", alpha, "/", beta);
  return {
    lowerInterval: (jStat.beta.inv(ciProbability, alpha, beta) * 100).toFixed(2),
    upperInterval: (jStat.beta.inv(1 - ciProbability, alpha, beta) * 100).toFixed(2)
  }
}

/*
Draw probability density functions of posterior distributions
*/
function drawPDF(svg, maxXDraw, graphWidth, maxY, graphHeight, axisPadding,
                 betaADraw, posteriorAColor, betaBDraw, posteriorBColor) {
    // add the x Axis for conversion percentage
    var xScale = d3.scaleLinear()
        .domain([0, maxXDraw])
        .range([0, graphWidth]);
    
    var xAxis = d3.axisBottom().scale(xScale).ticks(20);
    
     // Add the text label for X Axis
    svg.append("text")
      .attr("x", graphWidth + 100)
      .attr("y", graphHeight + 5)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Conversion %");
    
    svg.append("g")
      .attr("transform", "translate(" + axisPadding + "," + graphHeight + ")")
      .call(xAxis);

    // add the y Axis
    var yScale = d3.scaleLinear()
       .range([graphHeight, 0])
       .domain([0, maxY]);
    
    svg.append("g")
        .attr("transform", "translate(" + axisPadding + ", 0)")
        .call(d3.axisLeft(yScale));

    // Add the text label for Y axis
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(graphHeight / 2))
      .attr("y", axisPadding / 4)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Probability Density")
    
    // Plot the area of posterior A
    svg.append("path")
        .datum(betaADraw)
        .attr("fill", posteriorAColor)
        .attr("opacity", ".6")
        .attr("stroke", "#000")
        .attr("stroke-width", 1)
        .attr("stroke-linejoin", "round")
        .attr("transform", "translate(" + axisPadding + ", 0)")
        .attr("d",  d3.line()
          .curve(d3.curveBasis)
            .x(function(d) { 
              return xScale(d[0]); })
            .y(function(d) { return yScale(d[1]); })
        );

    // Plot the area of posterior B
    svg.append("path")
        .datum(betaBDraw)
        .attr("fill", posteriorBColor)
        .attr("opacity", ".6")
        .attr("stroke", "#000")
        .attr("stroke-width", 1)
        .attr("stroke-linejoin", "round")
        .attr("transform", "translate(" + axisPadding + ", 0)")
        .attr("d",  d3.line()
          .curve(d3.curveBasis)
            .x(function(d) { return xScale(d[0]); })
            .y(function(d) { return yScale(d[1]); })
        );  
  
}



/*
Draw cumulative density functions of posterior distributions
*/
function drawCDF(svg, maxXDraw, graphWidth, maxY, graphHeight, axisPadding, translateY,
                 betaADraw, posteriorAColor, betaBDraw, posteriorBColor) {
    // add the x Axis for conversion percentage
    var xScale = d3.scaleLinear()
        .domain([0, maxXDraw])
        .range([0, graphWidth]);
    
    var xAxis = d3.axisBottom().scale(xScale).ticks(20);
    
    // Add the text label for X Axis
    svg.append("text")
      .attr("x", graphWidth + 100)
      .attr("y", graphHeight + 5 + translateY)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Conversion %");
    
    svg.append("g")
      .attr("transform", "translate(" + axisPadding + "," + (graphHeight + translateY) + ")")
      .call(xAxis);

    // add the y Axis
    var yScale = d3.scaleLinear()
        .range([graphHeight, 0])
        .domain([0, maxY]);
    
    svg.append("g")
        .attr("transform", "translate(" + axisPadding + ", " + translateY + ")")
        .call(d3.axisLeft(yScale));

    // Add the text label for Y axis
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(((graphHeight / 2) + 5 + translateY)))
      .attr("y", axisPadding / 4)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Cumulative Probability (%)");
    
    // Plot the CDF of posterior A
    svg.append("path")
        .datum(betaADraw)
        .attr("fill", 'none')
        .attr("stroke", posteriorAColor)
        .attr("stroke-width", 2)
        .attr("stroke-linejoin", "round")
        .attr("transform", "translate(" + axisPadding + ", " + translateY + ")")
        .attr("d",  d3.line()
          .curve(d3.curveBasis)
            .x(function(d) { 
              return xScale(d[0]); })
            .y(function(d) { return yScale(d[1]); }));

    // Plot the CDF of posterior B
    svg.append("path")
        .datum(betaBDraw)
        .attr("fill", 'none')
        .attr("stroke", posteriorBColor)
        .attr("stroke-width", 2)
        .attr("stroke-linejoin", "round")
        .attr("transform", "translate(" + axisPadding + "," + translateY + ")")
        .attr("d",  d3.line()
          .curve(d3.curveBasis)
            .x(function(d) { return xScale(d[0]); })
            .y(function(d) { return yScale(d[1]); }));  
}

looker.plugins.visualizations.add({

 options: {
    alphaPrior: {
      type: "number",
      label: "Prior Beta Distribution's 'Alpha' Shape Parameter Value",
      default: 1,
    },
    betaPrior: {
      type: "number",
      label: "Prior Beta Distribution's 'Beta' Shape Parameter Value",
      default: 1
    },
    credibleIntervalPercent: {
      type: "number",
      label: "Credible Interval %",
      default: 95
    }
  },
  
 /**
 /**
  * The create function gets called when the visualization is mounted but before any
  * data is passed to it.
  **/
  create: function(element, config){
    element.style.fontFamily = `"Open Sans", "Helvetica", sans-serif`;
  },

 /**
  * UpdateAsync is the function that gets called (potentially) multiple times. It receives
  * the data and should update the visualization with the new data.
  **/
  updateAsync: function(data, element, config, queryResponse, details, doneRendering){
    console.log('-- Update Async --')
    console.log('data: ', data),
    console.log('config: ', config)
    console.log('queryResponse', queryResponse)
    
    var alphaPrior = config.alphaPrior;
    var betaPrior = config.betaPrior;
    var credibleIntervalPercent = config.credibleIntervalPercent;
    
    data = data.slice(0, 2); // Only calculate A/B test results for first 2 rows of data
    var labels = getLabels(queryResponse);
    var abTestData = getABTestData(data, labels.variant, labels.visitors, labels.conversions)
    
    var alphaPosteriorA =  alphaPrior + abTestData.conversionsFromA;
    var betaPosteriorA = betaPrior + abTestData.visitorsToA - abTestData.conversionsFromA;
    
    var alphaPosteriorB = alphaPrior + abTestData.conversionsFromB;
    var betaPosteriorB = betaPrior + abTestData.visitorsToB - abTestData.conversionsFromB;
    
    var credibleIntervalA = calculateCredibleInterval(credibleIntervalPercent, alphaPosteriorA, betaPosteriorA);
    var credibleIntervalB = calculateCredibleInterval(credibleIntervalPercent, alphaPosteriorB, betaPosteriorB);

    // set the dimensions and margins of the graph
    var posteriorAColor = "#69b3a2";
    var posteriorBColor = "#404080";
    var graphWidth = 500;
    var graphHeight = 250;
    var axisPadding = 40;
    var legendX = graphWidth / 10,
        legendY = graphHeight + 10 + axisPadding;
    var probabilityTextHeight = legendY + 70;
    var width = graphWidth + axisPadding + 1000,
        height = probabilityTextHeight + 20 + graphHeight + axisPadding;
        
    // Clear any existing SVGs
    d3.select(element).selectAll("*").remove();
    
    // append the svg object to the body of the page
    var svg = d3.select(element)
      .append("svg")
        .attr("width", width)
        .attr("height", height);
    
    // Calculate PDF points of posterior distribution
    var betaA = [];
    var betaB = [];
    var maxY = 0;
    
    // Draw beta distributions for conversion percentage
    var allPDFValuesA = []; // Track to determine when to cut off x-axis
    var allPDFValuesB = []; 
    for (i = 0; i <= 1; i += 0.01) {
        var pdfBetaA = jStat.beta.pdf(i, alphaPosteriorA, betaPosteriorA);
        var pdfBetaB = jStat.beta.pdf(i, alphaPosteriorB, betaPosteriorB);
        
        if (pdfBetaA > maxY) {
          maxY = pdfBetaA;  
        }
        if (pdfBetaB > maxY) {
          maxY = pdfBetaB;      
        }

        var percentageX = i * 100;
        betaA.push([percentageX, pdfBetaA]);
        betaB.push([percentageX, pdfBetaB]);
        
        if (pdfBetaA > 0) {
          allPDFValuesA.push(pdfBetaA);
        }
        if (pdfBetaB > 0) {
          allPDFValuesB.push(pdfBetaB);
        } 
    }
    
    // Don't bother drawing if PDF value is too small 
    var minPDFDraw = _.min([_.max(allPDFValuesA), _.max(allPDFValuesB)]) * 0.0000001; 
    // figure out what maxX should be
    var maxX = -1;
    for (var x = 0; x < betaA.length; x++) {
      var pdfA = betaA[x][1];
      var aX = betaA[x][0];
      if (pdfA > minPDFDraw && aX > maxX){
          maxX = aX;
      }
    }

    for (var x = 0; x < betaB.length; x++) {
      var pdfB = betaB[x][1];
      var bX = betaB[x][0];
      if (pdfB > minPDFDraw && bX > maxX ){
          maxX = bX;
      }
    }
    // don't draw past any values of maxX * 1.25 to center visualization
    var maxXDraw = maxX * 1.25;
    var betaADraw = _.filter(betaA, function(arr){ return arr[0] < maxXDraw });
    var betaBDraw = _.filter(betaB, function(arr){ return arr[0] < maxXDraw });
        
    // draw PDF of both posterior distributions
    drawPDF(svg, maxXDraw, graphWidth, maxY, graphHeight, axisPadding,
            betaADraw, posteriorAColor, betaBDraw, posteriorBColor);

    // Handmade legend 
    svg.append("circle").attr("cx", legendX + 5).attr("cy",legendY).attr("r", 6).style("fill", posteriorAColor)
    svg.append("circle").attr("cx",legendX + 5).attr("cy",legendY+30).attr("r", 6).style("fill", posteriorBColor)
    
    // Display credible interval calculations
    svg.append("text").attr("x", legendX + 20).attr("y", legendY)
      .text(credibleIntervalPercent + "% probability '" + abTestData.variantALabel +"' conversion is in range [" + credibleIntervalA.lowerInterval + "%, " + credibleIntervalA.upperInterval + "%]")
      .style("font-size", "14px")
      .attr("alignment-baseline","middle");
    
    svg.append("text").attr("x", legendX + 20).attr("y", legendY + 30)
      .text(credibleIntervalPercent + "% probability '" + abTestData.variantBLabel +"' conversion is in range [" + credibleIntervalB.lowerInterval + "%, " + credibleIntervalB.upperInterval + "%]")
      .style("font-size", "14px")
      .attr("alignment-baseline","middle");
    
    // Calculate which variant has a higher conversion
    var variant_win_str = compareConversionProbability(
      abTestData.variantALabel,
      abTestData.variantBLabel,
      alphaPosteriorA, betaPosteriorA, alphaPosteriorB, betaPosteriorB);
    
    // Render probability of variant A beating Variant B.
    svg.append("text")
      .attr("x", legendX-5)
      .attr("y", probabilityTextHeight)
      .text(variant_win_str)
      .style("font-size", "14px")
      .style("font-weight", "bold");

   
    // Calculate CDF points of posterior distributions
    var betaACDFDraw = [];
    var betaBCDFDraw = [];
    for (i = 0; i <= (maxX / 100); i += 0.01) {
      // convert probability to percentages
      var cdfBetaA = jStat.beta.cdf(i, alphaPosteriorA, betaPosteriorA) * 100;
      var cdfBetaB = jStat.beta.cdf(i, alphaPosteriorB, betaPosteriorB) * 100;  
      var percentageX = i * 100;
      betaACDFDraw.push([percentageX, cdfBetaA]);
      betaBCDFDraw.push([percentageX, cdfBetaB]);
    }
    
    // render CDF of posterior distributions
    drawCDF(svg, maxXDraw, graphWidth, 100, graphHeight, axisPadding, (probabilityTextHeight + 20),
            betaACDFDraw, posteriorAColor, betaBCDFDraw, posteriorBColor);
    
    doneRendering()
  }
});