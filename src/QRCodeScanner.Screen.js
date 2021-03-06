/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react'
import {
  Text,
  View,
  Alert,
  Button,
  Platform,
  NativeModules,
  Linking
} from 'react-native'
import Camera from 'react-native-camera'
import { styles } from './QRCodeScanner.Style'
import { Config } from './Config'
import Loader from './loader/Loader'
import { sendData } from './APIEngine'

const {ReactManager} = NativeModules

export default class QRCodeScanner extends Component<Props> {
  camera: Camera

  constructor (props) {
    super(props)
    this.watchId = 0
    this.locationSettingRequestShowing = false

    this.state = {
      inForeground: true,
      processing: false,
      qrCode: '',
      locationLoading: false,
      // flashOn: false,
      locationCompleted: false,
      longitude: 0,
      latitude: 0,
      accuracy: 0,
      backCamera: true,
    }
  }

  static goBackStaticFunc = () => {
    if (Config.rootTag != -1) {
      console.log('goBackToLifeUp app rootTag ' + Config.rootTag)
      if (Platform.OS === 'ios') {
        ReactManager.dismissPresentedViewController(Config.rootTag)
      } else {
        NativeModules.QRActivityStarter.goback_LifeUp()
      }

    }
  }

  goToSetting = () => {
    this.locationSettingRequestShowing = false
    Linking.canOpenURL('app-settings:').then(supported => {
      if (!supported) {
        console.log('Can\'t handle settings url')
      } else {
        return Linking.openURL('app-settings:')
      }
    }).catch(err => console.error('An error occurred', err))
  }

  static navigationOptions = ({navigation}) => ({
    headerLeft: <Button title={'Back'} onPress={() => {
      QRCodeScanner.goBackStaticFunc()
    }}></Button>
  })

  componentDidMount () {
    this.getLocation()
    console.log('componentDidMount is called')
    this.setState({
      inForeground: true
    })
  }

  componentWillUnmount () {
    console.log('componentWillUnmount is called')
    this.setState({
      inForeground: false,
      locationLoading: false
    })
    navigator.geolocation.clearWatch(this.watchId)

  }

  goBackToLifeUp = () => {
    this.setState({
      inForeground: false,
      locationLoading: false,
      processing: false
    }, () => {
      console.log('Go back to lifeup: rootTag ' + Config.rootTag)
      QRCodeScanner.goBackStaticFunc()
    })

  }

  getLocation = () => {
    const successCallback = (position) => {
      console.log('Location successCallback' + position)
      setTimeout(() => {
        this.setState({
          locationLoading: false,
          locationCompleted: true,
          // longitude: position.coords.longitude,
          // latitude: position.coords.latitude,
          // accuracy: position.coords.accuracy,
          longitude: 0,
          latitude: 0,
          accuracy: 0
        })
      }, 10000)

    }

    const errorCallback = (error) => {
      console.log('Location errorCallback' + error)
      this.setState({
        locationLoading: false,
        locationCompleted: true,
      })
      if (error.code == 1) {
        if (this.locationSettingRequestShowing == false) {
          this.locationSettingRequestShowing = true
          Alert.alert('App requires location info', 'Would you like to open the app setting?',
            [
              {text: 'Yes', onPress: () => this.goToSetting()},
              {
                text: 'Cancel', style: 'cancel', onPress: () => {
                this.locationSettingRequestShowing = false
                this.goBackToLifeUp()
              }
              },
            ], {cancelable: false})
        }

      } else {
        Alert.alert('Notice', 'Error code: ' + error.code + ': ' + error.message, [
          {
            text: 'OK',
            onPress: () => {
              this.goBackToLifeUp()
            }
          }
        ], {cancelable: false})
      }
    }
    const options = {enableHighAccuracy: false, timeout: 20000, maximumAge: 1000, distanceFilter: 50}
    this.watchId = navigator.geolocation.watchPosition(successCallback, errorCallback, options)
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options)
    console.log('watchPosition: ' + this.watchId)
  }

  onBarCodeRead = (e) => {
    console.log('onBarCodeRead processing: ' + this.state.processing)
    if (this.state.processing === true) {
      return
    }
    this.setState({
      processing: true,
    })
    while (this.state.locationCompleted === false) {
      console.log('onBarCodeRead locationCompleted: ' + this.state.locationCompleted)

    }

    if (this.state.longitude === 0 || this.state.latitude === 0) {
      Alert.alert('Notice', 'Loading location info failed', [{
        text: 'Ok',
        onPress: () => {
          this.goBackToLifeUp()
        }
      }], {cancelable: false})
      return;
    }


    const callback = async () => {
      try {
        let data = {
          ...this.state,
          qrCode: e.data
        }
        await sendData(data)
        Alert.alert('Success', 'The door is opened', [], {cancelable: false})
        setTimeout(() => {
          this.setState({
            processing: false
          }, () => {
            setTimeout(() => {
              this.goBackToLifeUp()
            }, 2000)
          }, 2000)
        })
        console.log('unlock the door successfully')
      } catch (error) {
        Alert.alert('Notice', '' + error, [{
          text: 'Ok',
          onPress: () => {
            // this.goBackToLifeUp()
            this.setState({
              processing: false
            }, () => {this.goBackToLifeUp()})
          }
        }], {cancelable: false})
      }
      // setTimeout(() => {
      //   this.setState({
      //     processing: false
      //   })
      // }, 10000)

    }
    callback()
  }
  renderMaskView = () => {
    return (
      <View style={styles.maskViewOuter}>
        <View style={styles.maskViewInnerTopDown}></View>
        <View style={styles.maskViewInnerMiddle}>
          <View style={styles.maskViewInnerMiddleOutside}></View>
          <View style={styles.qrcodeWindow}>
            <Loader loading={this.state.processing} text={'Unlocking'}/>
          </View>
          <View style={styles.maskViewInnerMiddleOutside}></View>
        </View>
        <View style={styles.maskViewInnerTopDown}></View>
      </View>
    )
  }
  renderNotAuthorizedView = () => {
    return (
      <View style={styles.notAuthorizedTextContainer}>
        <Text style={{textAlign: 'center'}}>
          Camera is not authorized for this app. Please enable it in Phone's settings.
        </Text>
      </View>
    )
  }

  render () {
    const cameraType = this.state.backCamera ? Camera.constants.Type.back : Camera.constants.Type.front

    return (
      <View style={styles.container}>
        {/*<Loader loading={this.state.locationLoading} text={'Getting location info'}/>*/}

        <Camera
          style={styles.preview}
          onBarCodeRead={this.state.inForeground ? this.onBarCodeRead : null}
          type={cameraType}
          ref={cam => this.camera = cam}
          aspect={Camera.constants.Aspect.fill}
          notAuthorizedView={this.renderNotAuthorizedView()}
          // flashMode={Camera.constants.FlashMode.torch}
          // torchMode={Camera.constants.TorchMode.on}
        >
          {this.renderMaskView()}
        </Camera>
      </View>
    )
  }
}

