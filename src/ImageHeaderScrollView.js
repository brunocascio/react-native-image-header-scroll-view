// @flow
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import _ from 'lodash';

export type Props = {
  children: React.Element<any>,
  childrenStyle: any,
  overlayColor: string,
  fadeOutForeground: boolean,
  foregroundParallaxRatio: number,
  maxHeight: number,
  maxOverlayOpacity: number,
  minHeight: number,
  minOverlayOpacity: number,
  renderFixedForeground: () => React.Element<any>,
  renderForeground: () => React.Element<any>,
  renderHeader: () => React.Element<any>,
  renderTouchableFixedForeground: () => React.Element<any>,
};

export type DefaultProps = {
  overlayColor: string,
  fadeOutForeground: boolean,
  foregroundParallaxRatio: number,
  maxHeight: number,
  maxOverlayOpacity: number,
  minHeight: number,
  minOverlayOpacity: number,
  renderFixedForeground: () => React.Element<any>,
  renderForeground: () => React.Element<any>,
  renderHeader: () => React.Element<any>,
};

export type State = {
  scrollY: Animated.Value,
  pageY: number,
};

class ImageHeaderScrollView extends Component<DefaultProps, Props, State> {
  container: *;
  scrollViewRef: ScrollView;
  state: State;

  static defaultProps: DefaultProps = {
    overlayColor: 'black',
    fadeOutForeground: false,
    foregroundParallaxRatio: 1,
    maxHeight: 125,
    maxOverlayOpacity: 0.3,
    minHeight: 80,
    minOverlayOpacity: 0,
    renderFixedForeground: () => <View />,
    renderForeground: () => <View />,
    renderHeader: () => <View />,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      scrollY: new Animated.Value(0),
      pageY: 0,
    };
  }

  getChildContext() {
    return {
      scrollY: this.state.scrollY,
      scrollPageY: this.state.pageY + this.props.minHeight,
    };
  }

  /*
   * Expose `ScrollView` API so this component is composable
   * with any component that expects a `ScrollView`.
   */
  getScrollResponder() {
    return this.scrollViewRef.getScrollResponder();
  }
  getScrollableNode() {
    return this.getScrollResponder().getScrollableNode();
  }
  getInnerViewNode() {
    return this.getScrollResponder().getInnerViewNode();
  }
  setNativeProps(props: Props) {
    this.scrollViewRef.setNativeProps(props);
  }
  scrollTo(...args: *) {
    this.getScrollResponder().scrollTo(...args);
  }

  interpolateOnImageHeight(outputRange: Array<number>) {
    const headerScrollDistance = this.props.maxHeight - this.props.minHeight;
    return this.state.scrollY.interpolate({
      inputRange: [0, headerScrollDistance],
      outputRange,
      extrapolate: 'clamp',
    });
  }

  renderHeader() {
    const overlayOpacity = this.interpolateOnImageHeight([
      this.props.minOverlayOpacity,
      this.props.maxOverlayOpacity,
    ]);

    const headerScale = this.state.scrollY.interpolate({
      inputRange: [-this.props.maxHeight, 0],
      outputRange: [3, 1],
      extrapolate: 'clamp',
    });

    const headerTransformStyle = {
      height: this.props.maxHeight,
      transform: [{ scale: headerScale }],
    };

    const overlayStyle = [
      styles.overlay,
      { opacity: overlayOpacity, backgroundColor: this.props.overlayColor },
    ];

    return (
      <Animated.View style={[styles.header, headerTransformStyle]}>
        {this.props.renderHeader()}
        <Animated.View style={overlayStyle} />
        <View style={styles.fixedForeground}>
          {this.props.renderFixedForeground()}
        </View>
      </Animated.View>
    );
  }

  renderForeground() {
    const headerTranslate = this.state.scrollY.interpolate({
      inputRange: [0, this.props.maxHeight * 2],
      outputRange: [0, -this.props.maxHeight * 2 * this.props.foregroundParallaxRatio],
      extrapolate: 'clamp',
    });
    const opacity = this.interpolateOnImageHeight([1, -0.3]);

    const headerTransformStyle = {
      height: this.props.maxHeight,
      transform: [{ translateY: headerTranslate }],
      opacity: this.props.fadeOutForeground ? opacity : 1,
    };
    return (
      <Animated.View style={[styles.header, headerTransformStyle]}>
        {this.props.renderForeground()}
      </Animated.View>
    );
  }

  renderTouchableFixedForeground() {
    if (!this.props.renderTouchableFixedForeground) {
      return <View />;
    }

    const height = this.interpolateOnImageHeight([this.props.maxHeight, this.props.minHeight]);

    const headerScale = this.state.scrollY.interpolate({
      inputRange: [-this.props.maxHeight, 0],
      outputRange: [3, 1],
      extrapolate: 'clamp',
    });

    const headerTransformStyle = {
      height,
      transform: [{ scale: headerScale }],
    };

    return (
      <Animated.View style={[styles.header, styles.touchableFixedForeground, headerTransformStyle]}>
        {this.props.renderTouchableFixedForeground()}
      </Animated.View>
    );
  }

  render() {
    const {
      children,
      childrenStyle,
      overlayColor,
      fadeOutForeground,
      foregroundParallaxRatio,
      maxHeight,
      maxOverlayOpacity,
      minHeight,
      minOverlayOpacity,
      renderFixedForeground,
      renderForeground,
      renderHeader,
      renderTouchableFixedForeground,
      ...scrollViewProps
    } = this.props;

    const headerScrollDistance = this.interpolateOnImageHeight([maxHeight, maxHeight - minHeight]);
    const topMargin = this.interpolateOnImageHeight([0, minHeight]);

    const childrenContainerStyle = StyleSheet.flatten([
      { transform: [{ translateY: headerScrollDistance }] },
      { backgroundColor: 'white', paddingBottom: maxHeight },
      childrenStyle,
    ]);

    return (
      <View
        style={styles.container}
        ref={ref => (this.container = ref)}
        onLayout={() => this.container.measureInWindow((x, y) => this.setState({ pageY: y }))}
      >
        {this.renderHeader()}
        <Animated.View style={[styles.container, { transform: [{ translateY: topMargin }] }]}>
          <ScrollView
            ref={ref => (this.scrollViewRef = ref)}
            style={styles.container}
            scrollEventThrottle={16}
            onScroll={Animated.event([
              { nativeEvent: { contentOffset: { y: this.state.scrollY } } },
            ])}
            {...scrollViewProps}
          >
            <Animated.View style={childrenContainerStyle}>
              {children}
            </Animated.View>
          </ScrollView>
        </Animated.View>
        {this.renderTouchableFixedForeground()}
        {this.renderForeground()}
      </View>
    );
  }
}

ImageHeaderScrollView.childContextTypes = {
  scrollY: PropTypes.instanceOf(Animated.Value),
  scrollPageY: PropTypes.number,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  headerChildren: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
  },
  fixedForeground: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    zIndex: 101,
  },
  touchableFixedForeground: {
    zIndex: 102,
  },
});

export default ImageHeaderScrollView;
