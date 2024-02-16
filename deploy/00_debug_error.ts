import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  // const controller = await ethers.getContract('PLSRegistrarController', deployer)
  // const error = controller.interface.parseError('0x477707e8000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000046d65676100000000000000000000000000000000000000000000000000000000')
  // console.log('error', error)

  // const provider = new ethers.providers.JsonRpcProvider('https://rpc.pulsechain.com', {
  //   chainId: 369,
  //   name: 'PulseChain',
  //   ensAddress: '0xbd5133993FCDED5945c5539D9f032261F0d13170'
  // })

  // const name = await provider.lookupAddress('0x6CbfDa597919672e8444356234fEDd0Ab7e45e13')
  // console.log('name', name);

  const pulseXOracle = await ethers.getContract('PulseXOracle', deployer)
  const price = await pulseXOracle.latestAnswer()
  console.log('price', price?.toString())
}

func.id = 'debug-error'
func.tags = ['DebugError']
func.dependencies = []

export default func
